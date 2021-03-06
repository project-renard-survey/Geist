/* @flow */

/*
 * Visualization reducers
 */

// TODO: Separate this file - 2016-02-15
// see react-boilerplate for an approach
// TODO: Immutable datastructures for performance - 2016-03-24

import { combineReducers } from 'redux'
import _ from 'lodash'
import update from 'immutability-helper'

import * as nodeActionTypes from '../actions/node'
import * as collectionActionTypes from '../actions/collection'
import * as uiActionTypes from '../actions/ui'
import * as fileActionTypes from '../actions/file'
import * as searchActionTypes from '../actions/search'

function entities(state={}, action, globalState) {
    return {
        nodes: nodes(state.nodes, action, globalState),
        edges: edges(state.edges, action, globalState),
        // collections: collections(state.collections, action, globalState),
        collectionEdges: collectionEdges(state.collectionEdges, action, globalState),
    }
}


function removeFirstOccurrence(array, elem) {
    const toRemove = array.indexOf(elem)
    if (toRemove < 0) {
        return array
    }
    return [ ...array.slice(0, toRemove), ...array.slice(toRemove + 1, -1) ]
}

export function nodes(state={}, action, collections) {
    /*
     * Handles the non-merging action types
     */
    switch(action.type) {
        case collectionActionTypes.CREATE_COLLECTION_SUCCESS:
            // TODO: this action shouldn't be called directly? - 2017-08-29
            // TODO: should be handled in server response? - 2017-08-28
            return {
                ...state,
                [action.id]: {
                    ...action.response.entities.collections[action.id],
                    collectionChains: [
                        [ action.parentId ]
                    ]
                }
            }

        case nodeActionTypes.REMOVE_NODE_SUCCESS:
            return _.omit(state, action.nodeId)

        case collectionActionTypes.ADD_NODE_TO_COLLECTION_SUCCESS:
            if (!state[action.nodeId].collectionChains) {
                state[action.nodeId].collectionChains = []
            }

            return update(state, {
                [action.nodeId]: {
                    collectionChains: { $apply: (chains) => 
                        _.uniqBy(
                            [ ...chains, ...action.collectionChains ],
                            JSON.stringify
                        )
                    }
                }
            })

        case collectionActionTypes.REMOVE_COLLECTION_SUCCESS: {
            let newState = update(state, {
                [action.collectionId]: { type: { $set: "node"}}
            })

            // TODO: this is very expensive to compute - 2017-08-29
            return _.mapValues(newState, (x) => update(x, {
                collectionChains: { $apply: (chains) => 
                    _.uniqBy(
                        (chains || []).map(chain => _.without(chain, action.collectionId)),
                        JSON.stringify
                    )
                }
            }))
        }

        case collectionActionTypes.REMOVE_NODE_FROM_COLLECTION_SUCCESS:
            /*
             * remove the collectionChains with ${collectionId} as last in the chain
             */
            return update(state, {
                [action.nodeId]: {
                    collectionChains: { $apply: (chains) => chains.filter(
                        chain => chain[chain.length-1] !== action.collectionId
                    )}
                }
            })

        case collectionActionTypes.MOVE_TO_ABSTRACTION_SUCCESS: {
            const sourceNode = state[action.sourceId]

            let newState = state;

            // must also update the nodes if source is a collection
            if (sourceNode.type === "collection") {
                const newCollectionChains = action.collectionChains.map((chain) =>
                    [ ...chain, action.sourceId ]
                )

                newState = _.mapValues(newState, (n) => update(n, {
                    collectionChains: { $apply: (chains) => {
                        if (!_.some(chains, (chain) => chain[chain.length-1] === action.sourceId)) {
                            return chains
                        }

                        return [
                            ...chains.filter(chain => chain[chain.length-1] !== action.sourceId),
                            ...newCollectionChains,
                        ]
                    }}
                }))
            }

            return update(newState, {
                [action.sourceId]: {
                    collectionChains: { $apply: (chains) => 
                        [
                            ...chains.filter(chain => chain[chain.length-1] !== action.sourceCollectionId),
                            ...action.collectionChains,
                        ]
                    }
                }
            })
        }

        case nodeActionTypes.REMOVE_EDGE_SUCCESS:
            return {
                ...state,
                [action.start]: {
                    ...state[action.start],
                    edges: _.without(state[action.start].edges, action.id),
                },
                [action.end]: {
                    ...state[action.end],
                    edges: _.without(state[action.end].edges, action.id),
                }
            }
        case uiActionTypes.TOGGLE_COLLAPSE_COLLECTION:
            return {
                ...state,
                [action.id]: {
                    ...state[action.id],
                    collapsed: !state[action.id].collapsed,
                }
            }

        case nodeActionTypes.CONVERT_NODE_TO_COLLECTION_SUCCESS:
            return update(state, {
                [action.id]: { $merge: {
                    type: 'collection',
                    collapsed: true,
                }
                }
            })
            return {
                ...state,
                [action.id]: {
                    ...state[action.id],
                    ...action.response.entities.nodes[action.id],
                    type: 'collection',
                    collapsed: true,
                }
            }

        default:
            if (action.response && action.response.entities && action.response.entities.nodes) {
                // TODO: probably useful to use models with something like redux-orm - 2017-09-01
                // merge, if the object already exists, keep the collapsed value
                // otherwise, set the collapsed value
                // return _.merge({}, state, action.response.entities.nodes)

                const newState = { ...state }
                _.forEach(action.response.entities.nodes, node => {
                    if (!state[node.id]) {
                        // create, set some default values
                        newState[node.id] = {
                            ...node,
                            collapsed: true,
                        }
                    }
                    else {
                        // update, merge
                        newState[node.id] = _.extend({}, state[node.id], node)
                    }
                })

                return newState
            }

            return state
    }
}

function edges(state={}, action, globalState) {
    /*
     * Handles the non-merging action types
     */
    switch(action.type) {
        case nodeActionTypes.REMOVE_NODE_SUCCESS:
            // TODO: when removing the node, remove the edge as well - 2016-09-10
            // TODO: basically, need to know which edges have this node as a from or to, and then delete them  - 2016-09-10
            return state
        case nodeActionTypes.REMOVE_EDGE_SUCCESS:
            return _.omit(state, action.id)


        default:
            if (action.response && action.response.entities && action.response.entities.edges) {
                return _.merge({}, state, action.response.entities.edges)
                return {
                    ...state,
                    ...action.response.entities.edges
                }
            }

            return state
    }
}
function collectionEdges(state={}, action) {
    /*
     * Handles the non-merging action types
     */
    switch(action.type) {
        case collectionActionTypes.REMOVE_COLLECTION_SUCCESS:
            // TODO: need to know which edges have this collection as a to or a from - 2016-09-06
            const { collectionId } = action
            return _.filter(state, edge => {
                return !(edge.start === collectionId || edge.end === collectionId)
            })
            return state

        case uiActionTypes.ADD_COLLECTION:
            // temporarily add a collection and defer synching with the server
            return {
                ...state,
                [action.edgeId]: {
                    ...state[action.edgeId],
                    start: action.start,
                    end: action.id,
                    type: 'node',
                    editMode: true,
                    isSynced: false,
                }
            }

        case uiActionTypes.TOGGLE_EDIT_MODE:
            if (action.editMode) {
                // add the addCollectionEdges
                return {
                    ...state,
                    ...action.addCollectionEdges
                }
            } else {
                // remove the addCollectionEdges
                return _.omitBy(state, (e) => e.type === 'addCollection')
            }


        default:
            if (action.response && action.response.entities && action.response.entities.collectionEdges) {
                return _.merge({}, state, action.response.entities.collectionEdges)
            }

            return state
    }
}


function collections(state={}, action) {
    /*
     * Handles the non-merging action types
     */
    switch(action.type) {
            // u       case collectionActionTypes.REMOVE_COLLECTION_SUCCESS:
            //             return _.omit(state, action.collectionId)

        case collectionActionTypes.CREATE_COLLECTION_SUCCESS:
            // TODO: should be handled in server response? - 2017-08-28
            return {
                ...state,
                [action.id]: {
                    ...action.response.entities.collections[action.id],
                    collectionChains: [
                        [ action.parentId ]
                    ]
                }
            }

            //         case uiActionTypes.TOGGLE_EDIT_MODE:
            //             if (action.editMode) {
            //                 // add the addCollectionNodes
            //                 return {
            //                     ...state,
            //                     ...action.addCollectionNodes
            //                 }
            //             } else {
            //                 // remove the addCollectionNodes
            //                 return _.omitBy(state, (e) => e.type === 'addCollection')
            //             }

            //         case uiActionTypes.ADD_COLLECTION:
            //             // TODO: should this be done with more of a "sync" behaviour? - 2017-06-14
            //             // temporarily add a collection and defer synching with the server
            //             return {
            //                 ...state,
            //                 [action.id]: {
            //                     ...state[action.id],
            //                     type: 'node',
            //                     isNew: true,
            //                     parentId: action.start, // parent node
            //                     edgeId: action.edgeId, // id of edge to the parent node
            //                     // TODO: created should also be set here - 2017-06-07
            //                 }
            //             }

        default:
            if (action.response && action.response.entities && action.response.entities.collections) {
                return _.merge({}, state, action.response.entities.collections)
            }

            return state
    }
}

// a trade-off between space and performance for updating
function adjacencyMap(state={}, action) {
    // TODO: depend on nodes state - 2017-08-28
    /*
     * To what nodes does this node link?
     * allow duplicates in adjacency map so that upon removing edge just remove first occurrence of the edge id
     */
    switch(action.type) {
        case nodeActionTypes.REMOVE_NODE_SUCCESS:
            return _(state)
                .omit(action.nodeId)
                .mapValues(list => {
                    // TODO: bad performance
                    return _.without(list, action.nodeId) 
                })
                .value()

        case nodeActionTypes.REMOVE_EDGE_SUCCESS:
            return update(state, {
                [action.start]: { $apply: (arr) => removeFirstOccurrence(arr, action.end) }
            })

        default:
            // TODO: handle duplicates - 2017-08-27
            if (action.response && action.response.entities && action.response.entities.edges) {
                const adjMap = {}

                _.forEach(action.response.entities.edges, edge => {
                    if (!adjMap[edge.start]) {
                        if (state[edge.start]) {
                            adjMap[edge.start] = [ ...state[edge.start] ]
                        } else {
                            adjMap[edge.start] = []
                        }
                    }

                    adjMap[edge.start].push(edge.end)
                })

                return {
                    ...state,
                    ...adjMap,
                }
            }

            return state
    }
}

function reverseAdjacencyMap(state={}, action) {
    // TODO: depend on nodes state - 2017-08-28
    /*
     * What nodes link to this node?
     */
    switch(action.type) {
        case nodeActionTypes.REMOVE_NODE_SUCCESS:
            return _(state)
                .omit(action.nodeId)
                .mapValues(list => {
                    // TODO: bad performance when highly connected - 2017-08-27
                    return _.without(list, action.nodeId) 
                })
                .value()

        case nodeActionTypes.REMOVE_EDGE_SUCCESS:
            return update(state, {
                [action.end]: { $apply: (arr) => removeFirstOccurrence(arr, action.start) }
            })

        default:

            // TODO: handle duplicates - 2017-08-27
            if (action.response && action.response.entities && action.response.entities.edges) {

                const adjMap = {}

                _.forEach(action.response.entities.edges, edge => {
                    if (!adjMap[edge.end]) {
                        if (state[edge.end]) {
                            adjMap[edge.end] = [ ...state[edge.end] ]
                        } else {
                            adjMap[edge.end] = []
                        }
                    }

                    adjMap[edge.end].push(edge.start)
                })

                return {
                    ...state,
                    ...adjMap
                }

            }

            return state
    }
}

function edgeListMap(state={}, action) {
    // TODO: depend on edge state, (can be derived directly from it, then no need for extra logic) - 2017-08-28
    /*
     * For every node, keep track of the incoming edges and outgoing edges
     * this way we don't have to keep this information up to date explicitly when fetching
     */

    switch(action.type) {
        case nodeActionTypes.REMOVE_NODE_SUCCESS:
            const edgeMap = state[action.nodeId]
            const edgeIds = [ ...edgeMap.from, ...edgeMap.to ]

            // need to get all edges involved with ${action.nodeId}
            return _(state)
                .omit(action.nodeId)
                .mapValues(edgeMap => {
                    return update(edgeMap, {
                        from: { $apply: (x) => _.without(x, ...edgeIds) },
                        to: { $apply: (x) => _.without(x, ...edgeIds) },
                    })
                })
                .value()
        case nodeActionTypes.REMOVE_EDGE_SUCCESS:
            return {
                ...state,
                [action.start]: {
                    from: _.without(state[action.start].from, action.id),
                    to: state[action.start].to,
                },
                [action.end]: {
                    from: state[action.end].from,
                    to: _.without(state[action.end].to, action.id),
                }
            }
        default:
            // TODO: handle duplicates - 2017-08-28
            let newState = state

            if (action.response && action.response.entities && action.response.entities.nodes) {
                // add nodes if they are not in the map yet
                _.forEach(Object.keys(action.response.entities.nodes), (id) => {
                    if (!newState[id]) {
                        newState[id] = {
                            from: [],
                            to: [],
                        }
                    }
                })
            }

            if (action.response && action.response.entities && action.response.entities.edges) {
                _.forEach(action.response.entities.edges, edge => {
                    // TODO: should be added regardless? - 2017-08-28
                    if (!newState[edge.start]) {
                        newState[edge.start] = { from: [], to: [] }
                    }
                    if (!newState[edge.end]) {
                        newState[edge.end] = { from: [], to: [] }
                    }

                    newState = update(newState, {
                        [edge.start]: { from: { $push: [ edge.id ] } },
                        [edge.end]: { to: { $push: [ edge.id ] } }
                    })
                })
            }

            return newState
    }
}
function allNodesByCollectionId(state={}, action) {
    /*
     * this represents all children recursively
     * // TODO: a more generic tree datastructure - 2017-09-20
     */
    switch(action.type) {
        case collectionActionTypes.GET_COLLECTION_SUCCESS:
        case collectionActionTypes.GET_COLLECTIONL1_SUCCESS: {
            let newState = { ...state }
            // for every node, add them to the corresponding collection list

            _.forEach(action.response.entities.nodes, node => {
                const uniqueCollections = _.uniq(_.flatten(node.collectionChains))

                _.forEach(uniqueCollections, c => {
                    if (!newState[c]) {
                        newState[c] = [ node.id ]
                    } else {
                        // TODO: terrible performance on this - 2017-09-04
                        newState[c] = _.union( newState[c], [ node.id ])
                    }
                })
            })

            return newState
        }

        case collectionActionTypes.ADD_NODE_TO_COLLECTION_SUCCESS: {
            let newState = { ...state }
            const uniqueCollections = _.uniq(_.flatten(action.collectionChains))

            _.forEach(uniqueCollections, c => {
                if (!newState[c]) {
                    newState[c] = [ action.nodeId ]
                } else {
                    // TODO: terrible performance on this - 2017-09-04
                    newState[c] = _.union( newState[c], [ action.nodeId ])
                }
            })

            return newState
        }

        case collectionActionTypes.REMOVE_NODE_FROM_COLLECTION_SUCCESS:
            return update(state, {
                [action.collectionId]: { $apply: (nodes) => _.without(nodes, action.nodeId) }
            })

        case collectionActionTypes.REMOVE_COLLECTION_SUCCESS:
            return _.omit(state, action.collectionId)

        case collectionActionTypes.MOVE_TO_ABSTRACTION_SUCCESS: {
            let newState = state;

            if (!newState[action.targetId]) {
                newState[action.targetId] = []
            }

            if (action.sourceNode.type === "collection") {
                /*
                 * Add nodes from source to target collection as well
                 */
                newState = update(state, {
                    [action.targetId]: { $set: _.union(state[action.targetId], state[action.sourceId]) }
                })
            }

            return update(newState, {
                [action.targetId]: { $push: [ action.sourceId ]}
            })
        }

        default:
            return state
    }
}

function nodesByCollectionId(state={}, action) {
    /*
     * this represents only direct children
     * // TODO: a more generic tree datastructure - 2017-09-20
     */

    switch(action.type) {
        case collectionActionTypes.GET_COLLECTION_SUCCESS:
        case collectionActionTypes.GET_COLLECTIONL1_SUCCESS: {
            // TODO: only direct children - 2017-09-20

            let newState = { ...state }
            // for every node, add them to the corresponding collection list

            _.forEach(action.response.entities.nodes, node => {
                // TODO: this shouldn't include the root collection - 2017-09-20
                const collections = _.flatten((node.collectionChains || []).map(chain => chain[chain.length - 1]))

                _.forEach(collections, c => {
                    if (!newState[c]) {
                        newState[c] = [ node.id ]
                    } else {
                        // TODO: terrible performance on this - 2017-09-04
                        newState[c] = _.union( newState[c], [ node.id ])
                    }
                })
            })

            return newState
        }

        case collectionActionTypes.ADD_NODE_TO_COLLECTION_SUCCESS: {
            let newState = { ...state }

            const collections = _.flatten(action.collectionChains.map(chain => chain[chain.length - 1]))

            _.forEach(collections, c => {
                if (!newState[c]) {
                    newState[c] = [ action.nodeId ]
                } else {
                    // TODO: terrible performance on this - 2017-09-04
                    newState[c] = _.union( newState[c], [ action.nodeId ])
                }
            })

            return newState
        }

        case collectionActionTypes.REMOVE_NODE_FROM_COLLECTION_SUCCESS:
            return update(state, {
                [action.collectionId]: { $apply: (nodes) => _.without(nodes, action.nodeId) }
            })

        case collectionActionTypes.REMOVE_COLLECTION_SUCCESS:
            return _.omit(state, action.collectionId)

        case collectionActionTypes.MOVE_TO_ABSTRACTION_SUCCESS: {
            let newState = state;

            if (!newState[action.targetId]) {
                newState[action.targetId] = []
            }

            if (action.sourceNode.type === "collection") {
                /*
                 * Add nodes from source to target collection as well
                 */
                newState = update(state, {
                    [action.targetId]: { $set: _.union(state[action.targetId], state[action.sourceId]) }
                })
            }

            return update(newState, {
                [action.targetId]: { $push: [ action.sourceId ]}
            })
        }

        default:
            return state
    }
}

function archive(state=[], action) {
    switch(action.type) {
        case nodeActionTypes.REMOVE_NODE_SUCCESS:
            return _.without(state, action.nodeId)
        case nodeActionTypes.GET_ARCHIVE_SUCCESS:
            return action.response.result
        case nodeActionTypes.CREATE_NODE_SUCCESS:
            return [ ...state, action.response.result ]
        case nodeActionTypes.CLEAR_ARCHIVE_SUCCESS:
            return []
        default:
            return state
    }
}

const initialErrorState = {
    errors: [],
    lastError: null,
}
// error handling, for displaying to user
function errors(state = initialErrorState, action) {

    if (action.type.endsWith('FAILURE')) {
        const { type, isHandled, error } = action

        const newError = {
            ...error,
            type,
            isHandled, // is being handled in the UI or should be handled by global UI
        }

        return {
            ...state,
            errors: [ ...errors, newError ],
            lastError: newError,
        }
    }

    if (action.type === uiActionTypes.RESET_ERROR_MESSAGE) {
        return { ...state, lastError: null }
    }

    return state
}


// keeps track of the number of calls being made for each request
// // TODO: Change to tokens? - 2016-05-11
const initialRequestState = _.chain({ ...nodeActionTypes, ...collectionActionTypes })
    .pickBy((val, key) => key.endsWith('REQUEST'))
    .map((val, key) => [ key.split('_REQUEST')[0], false ])
    .fromPairs()
    .value()
function loadingStates(state=initialRequestState, action) {
    if (action.type.endsWith('REQUEST')) {
        return Object.assign({}, state, {
            [action.type.split('_REQUEST')[0]]: true,
        })
    }
    if (action.type.endsWith('SUCCESS')) {
        return Object.assign({}, state, {
            [action.type.split('_SUCCESS')[0]]: false,
        })
    }

    return state
}

// keeps track of whether all entities are synced or not
// TODO: on FAILURE, have a different synced state (failed or something) - 2017-08-26
function synced(state=0, action) {
    if (action.type.endsWith('REQUEST')) {
        return state + 1
    }
    else if (action.type.endsWith('SUCCESS') || action.type.endsWith('FAILURE')) {
        return state - 1
    }

    return state
}

// TODO: Make this local to the component? - 2016-07-11
function allSearch(state=[], action) {
    switch(action.type) {
        case searchActionTypes.SEARCH_ALL_SUCCESS:
            return action.response
        default:
            return state
    }
}

const initialAbstractGraphUIState = {
    // can be "view", "edit", "focus" or "expand"
    mode: "view",
    focus: {
        id: null,
    },
}
function abstractGraphUiState(state=initialAbstractGraphUIState, action) {
    /*
     * UI state related to the graph
     */
    switch(action.type) {
        case uiActionTypes.TOGGLE_ABSTRACT_EDIT_MODE:
            return {
                ...state,
                mode: state.mode === "edit" ? "view" : "edit",
            }

        default:
            return state;
    }
}


const initialGraphUIState = {
    // can be "view", "edit", "focus" or "expand"
    mode: "edit",
    focus: {
        id: null,
    },
}
function graphUiState(state=initialGraphUIState, action) {
    /*
     * UI state related to the graph
     */
    switch(action.type) {
        case uiActionTypes.SET_ACTIVE_COLLECTION:
        case uiActionTypes.SET_ACTIVE_NODE:
        case uiActionTypes.ADD_COLLECTION:
            return {
                ...state,
                focus: {
                    id: action.id,
                }
            }

        case uiActionTypes.SET_GRAPH_MODE:
            return {
                ...state,
                mode: action.payload,
            }

        case uiActionTypes.TOGGLE_EDIT_MODE:
            return {
                ...state,
                mode: state.mode === "edit" ? "view" : "edit",
            }



        default:
            return state;
    }
}


const initialUiState = {
    windowProps: {},
    connectWindowOpened: false,
    addRelationWindowOpened: false,
    addRelationCollectionWindowOpened: false,
    addPictureWindowOpened: false,
    addVideoWindowOpened: false,
    addAudioWindowOpened: false,
    createCollectionWindowOpened: false,
    createCollectionWindowState: {
        title: "",
        description: "",
    },

    addNodeToCollectionWindowState: {
        opened: false,
        collection: null,
    },

    activeCollections: [],

    archiveSidebar: {
        opened: false,
    },
    abstractionSidebar: {
        opened: false,
    },
}

function uiState(state=initialUiState, action) {
    // TODO: cleanup - 2017-08-26
    switch(action.type) {
        case uiActionTypes.SHOW_CONNECT_WINDOW:
            return {
                ...state,
                connectWindowOpened: true,
            }
        case uiActionTypes.HIDE_CONNECT_WINDOW:
            return {
                ...state,
                connectWindowOpened: false,
            }
        case uiActionTypes.SHOW_ADD_RELATION_WINDOW:
            return {
                ...state,
                windowProps: action.windowProps,
                addRelationWindowOpened: true,
            }
        case uiActionTypes.SHOW_ADD_COLLECTION_RELATION_WINDOW:
            return {
                ...state,
                windowProps: action.windowProps,
                addCollectionRelationWindowOpened: true,
            }
        case uiActionTypes.HIDE_ADD_RELATION_WINDOW:
            return {
                ...state,
                addRelationWindowOpened: false,
                addCollectionRelationWindowOpened: false,
            }
        case uiActionTypes.SHOW_CREATE_COLLECTION_WINDOW:
            return {
                ...state,
                createCollectionWindowOpened: true,
                // createCollectionWindowState: action.payload,
            }
        case uiActionTypes.HIDE_CREATE_COLLECTION_WINDOW:
            return {
                ...state,
                createCollectionWindowOpened: false,
            }
        case uiActionTypes.SHOW_ADD_NODE_TO_COLLECTION_WINDOW:
            return {
                ...state,
                addNodeToCollectionWindowState: {
                    ...action.payload,
                    opened: true,
                }
            }
        case uiActionTypes.HIDE_ADD_NODE_TO_COLLECTION_WINDOW:
            return {
                ...state,
                addNodeToCollectionWindowState: {
                    ...state.addNodeToCollectionWindowState,
                    opened: false,
                }
            }
        case uiActionTypes.SHOW_ADD_PICTURE_WINDOW:
            return {
                ...state,
                addPictureWindowOpened: {
                    ...action.payload,
                    opened: true,
                }
            }
        case uiActionTypes.HIDE_ADD_PICTURE_WINDOW:
            return {
                ...state,
                addPictureWindowOpened: {
                    ...state.addPictureWindowOpened,
                    opened: false,
                }
            }
        case uiActionTypes.SHOW_ADD_VIDEO_WINDOW:
            return {
                ...state,
                addVideoWindowOpened: {
                    ...action.payload,
                    opened: true,
                }
            }
        case uiActionTypes.HIDE_ADD_VIDEO_WINDOW:
            return {
                ...state,
                addVideoWindowOpened: {
                    ...state.addVideoWindowOpened,
                    opened: false,
                }
            }
        case uiActionTypes.SHOW_ADD_AUDIO_WINDOW:
            return {
                ...state,
                addAudioWindowOpened: {
                    ...action.payload,
                    opened: true,
                }
            }
        case uiActionTypes.HIDE_ADD_AUDIO_WINDOW:
            return {
                ...state,
                addAudioWindowOpened: {
                    ...state.addVideoWindowOpened,
                    opened: false,
                }
            }
        case uiActionTypes.SHOW_ARCHIVE_SIDEBAR:
            return {
                ...state,
                archiveSidebar: {
                    ...action.payload,
                    opened: true,
                }
            }
        case uiActionTypes.HIDE_ARCHIVE_SIDEBAR:
            return {
                ...state,
                archiveSidebar: {
                    ...state.archiveSidebar,
                    opened: false,
                }
            }

        case uiActionTypes.SHOW_ABSTRACTION_SIDEBAR:
            return {
                ...state,
                abstractionSidebar: {
                    ...action.payload,
                    opened: true,
                }
            }
        case uiActionTypes.HIDE_ABSTRACTION_SIDEBAR:
            return {
                ...state,
                abstractionSidebar: {
                    ...state.abstractionSidebar,
                    opened: false,
                }
            }

        default:
            return state
    }
}

function user(state={}, action) {
    switch(action.type) {
            // case ActionTypes.UPDATE_USER_UI_SUCCESS:
            //     return action.response
            // case ActionTypes.UPDATE_USER_PROFILE_SUCCESS:
            //     return action.response
        default:
            return state
    }
}

function rootReducer(state={}, action) {
    return {
        entities: entities(state.entities, action, state),
        adjacencyMap: adjacencyMap(state.adjacencyMap, action),
        reverseAdjacencyMap: reverseAdjacencyMap(state.reverseAdjacencyMap, action),
        edgeListMap: edgeListMap(state.edgeListMap, action),
        nodesByCollectionId: nodesByCollectionId(state.nodesByCollectionId, action),
        allNodesByCollectionId: allNodesByCollectionId(state.allNodesByCollectionId, action),
        archive: archive(state.archive, action),
        // errorMessage: errorMessage(state.errorMessage, action),
        loadingStates: loadingStates(state.loadingStates, action),
        synced: synced(state.synced, action),
        allSearch: allSearch(state.allSearch, action),
        uiState: uiState(state.uiState, action),
        graphUiState: graphUiState(state.graphUiState, action),
        abstractGraphUiState: abstractGraphUiState(state.abstractGraphUiState, action),
        user: user(state.user, action),
        errors: errors(state.errors, action),
    }
}

export default rootReducer

/*
 * SELECTORS
 * See https://github.com/reactjs/reselect
 */

import { createSelector } from 'reselect'

export const getNodes = (state, id) => state.entities.nodes
export const getNode = (state, id) => state.entities.nodes[id]
export const getNodesForIds = (ids) => ids.map(id => getNode(state, id))

export const getEdges = (state, id) => state.entities.edges
export const getEdge = (state, id) => state.entities.edges[id]

export const getCollections = (state, id) => _.filter(state.entities.nodes, x => ["root", "collection"].includes(x.type))
export const getCollection = (state, id) => state.entities.nodes[id]

export const getCollectionEdge = (state, id) => state.entities.collectionEdges[id]
export const getCollectionEdges = (state, id) => _.map(state.entities.collectionEdges, x => x)

export const getEdgeListMap = (state) => state.edgeListMap

export const getArchiveNodes = (state) => state.archive.map(id => getNode(state, id))


export const getCollectionsByNodeId = (state, id) => {
    const node = getNode(state, id)

    if (!node) {
        return []
    }

    return (node.collections || []).map(id => getCollection(state, id))
    // return (node.properties.collections || []).map(id => getCollection(state, id))
}

export const getL1NodeIds = (state, id) => {
    return [
        // id,
        ...(state.adjacencyMap[id] || []),
        ...(state.reverseAdjacencyMap[id] || []),
    ]
}
export const getL1Nodes = (state, id) => {
    /*
     * get the directly neighbouring nodes (including the node itself)
     */
    return getL1NodeIds(state, id).map(id => getNode(state, id))
}

export const getL2NodeIds = (state, id) => {
    /*
     * A simple DFS keeping track of depth
     */
    const node = getNode(state, id)

    if (!node) {
        return []
    }


    let visitedMap = { [id]: node }
    let nodeIds = [ id ]
    let queue = [ id ]

    let depth = 0
    let timeToDepthIncrease = 1
    let pendingDepthIncrease = true

    while(queue.length !== 0) {
        if (--timeToDepthIncrease === 0) {
            // reached a new depth level
            depth++;   
            pendingDepthIncrease = true
        }

        if (depth > 2) {
            break;
        }

        const currentId = queue.shift() // TODO: O(N), should be constant - 2017-08-26
        const neighbours = getL1NodeIds(state, currentId)

        neighbours.forEach(id => {
            if (visitedMap[id]) {

                return;
            }
            visitedMap[id] = getNode(state, id)
            nodeIds.push(id)
            queue.push(id)

            if (pendingDepthIncrease) {
                // this is the first node of the new depth level, hence # nodes in next depth = length of the queue
                timeToDepthIncrease = queue.length
                pendingDepthIncrease = false
            }
        })
    }

    return nodeIds
}

export const getL2Nodes = (state, id) => {
    return getL2NodeIds(state, id)
        .map(id => getNode(state, id))
}

export const getL1EdgeIds = (edgeListMap, id) => {
    /*
     * Direct edges from node
     */

    if (!edgeListMap[id]) {
        return []
    }

    return [
        ...edgeListMap[id].from,
        ...edgeListMap[id].to,
    ]
}

export const getL1Edges = (state, id) => {
    // TODO: not correct - 2017-09-13

    return getL1EdgeIds(getEdgeListMap(state), id)
        .map(x => getEdge(state, x))
}

export const getEdgeIdsForNodes = (state, ids) => {
    /*
     * Gets all edges between [ ids ] (not including their neighbours)
     */

    const nodeMap = _.reduce(ids, (map, id) => {
        map[id] = true
        return map
    }, {})

    // filter edges that have start/end not inside this collection of elements
    return _(ids)
        .map(id => getL1Edges(state, id))
        .flatMap()
        .uniqBy('id')
        .filter(edge => {
            return _.every([edge.start, edge.end], (id) => nodeMap[id])
        })
        .map(x => x.id)
        .value()
}

export const getL2Edges = (state, id) => {
    // TODO: more efficient - 2017-08-26
    // TODO: combine the calls of getL2Nodes and getL2Edges - 2017-08-26
    return getEdgeIdsForNodes(state, getL2NodeIds(state, id))
        .map(id => getEdge(state, id))
}

export const getCollectionChain = createSelector(
    getNodes,
    (_, props) => props.collectionChainIds,
    (collectionMap, collectionChainIds) => {
        return _(collectionChainIds)
            .map(id => collectionMap[id])
            .filter(edge => edge !== undefined)
            .value()
    }
)

export const getNodesBelowAbstraction = createSelector(
    /*
     * returns a map of all the nodes below in the abstraction
     */
    getNodes,
    (_, props) => props.collectionChainIds,
    (nodes, collectionChain) => {
        return _.pickBy(nodes, node => (
                _.some(node.collectionChains, (chain) =>
                    _.intersection(collectionChain, chain).length === collectionChain.length
                )
            ))
    }
    // .map(node => node.id)
)

export const getEdgesBelowAbstraction = createSelector(
    getNodesBelowAbstraction,
    getEdges,
    getEdgeListMap,
    (nodeMap, edgeMap, edgeListMap) => {
        // get edges between these nodes

        const nodeIds = _.map(nodeMap, node => node.id)

        // filter edges that have start/end not inside this collection of elements
        return _(nodeIds)
            .map(id => getL1EdgeIds(edgeListMap, id))
            .flatMap()
            .uniq()
            .map(id => edgeMap[id])
            .filter(edge => {
                return _.every([edge.start, edge.end], (id) => nodeMap[id])
            })
            .keyBy(x => x.id)
            // .map(x => x.id)
            .value()
    }
)

export const getNeighbouringNodesAndEdgesByCollectionId = (state, { collectionChainIds }) => {

    /*
     * gets all nodes and edges that are part of the chain of collection with id ${id}
     */
    // TODO: memoize - 2017-08-27
    // TODO: test this properly - 2017-08-26

    const nodes = getNodes(state)
        .filter(node => (
            _.some(node.collectionChains, (chain) =>
                _.intersection(collectionChainIds, chain).length === collectionChainIds.length
            )
        ))
        .map(node => node.id)

    const edges = getEdgeIdsForNodes(state, nodes)

    return {
        nodes,
        edges,
    }
}

export const getNodesAndEdgesByCollectionId = createSelector(
    (state, { collectionId }) => getCollection(state, collectionId),
    getNodesBelowAbstraction,
    getEdgesBelowAbstraction,
    (state) => state.nodesByCollectionId, // direct children
    (state) => state.allNodesByCollectionId, // all children
    (_, { collectionChainIds }) => collectionChainIds,
    (parentCollection, nodeMap, edgeMap, nodesByCollectionId, allNodesByCollectionId, collectionChainIds) => {
        /*
         * This gets the direct nodes including their children
         */

        if (!parentCollection) {
            // TODO: not necessary, just have a loading state
            return {
                nodes: [],
                collections: [],
                visibleCollections: [],
                edges: [],
                collectionChain: [],
                nodeTree: [],
            }
        }

        const nodes = _.filter(nodeMap, n => n.type === 'node')
        const collections = _.filter(nodeMap, n => n.type === 'collection')

        let visibleCollections = []
        let visibleEdges = []

        let hiddenNodeMap = {}
        let visibleNodeMap = {}

        // copy edges
        let transformedEdges = _.map(edgeMap, e => Object.assign({}, e))

        const collectionIds = collections.map(c => c.id)

        // add :NODE nodes that are direct children of this collection
        nodes.forEach(node => {
            if (_.some(node.collectionChains, (list) => _.isEqual(list, collectionChainIds))) {
                visibleNodeMap[node.id] = node
            }
        })

        // TODO: need to filter edges that go outside the collection
        transformedEdges = transformedEdges.filter(e => {
            /*
             * iterate over all edges
             * filter edges that go outside the collection
             */

            // if start is not part of this collection, remove the edge
            if (_.every(nodeMap[e.start].collectionChains, (list) =>_.difference(collectionChainIds, list).length > 0)) {
                return false;
            }
            // if end is not part of this collection, remove the edge
            if (_.every(nodeMap[e.end].collectionChains, (list) =>_.difference(collectionChainIds, list).length > 0)) {
                return false;
            }

            return true
        })

        const filteredCollections = _(collections)
            .sortBy('collectionChains')
            .filter(c => {
                // if this is a parent collection, don't handle it
                if (collectionChainIds.includes(c.id)) {
                    return false;
                }

                // is a direct child
                // TODO: do this at the same time with direct nodes children
                if (_.some(c.collectionChains, (list) => _.isEqual(list, collectionChainIds))) {
                    return true
                }


                // case 1: only one parent collection
                // case 2: multiple parent collections
                // case 3: combination of external collections and child collections

                // check if the direct parent is collapsed or not
                // TODO: this would be a lot easier with a data structure created from abstraction edges - 2017-09-01
                const parentCollections = c.collectionChains
                    .filter(chain => _.intersection(collectionChainIds, chain).length === collectionChainIds.length)
                    .map(list => nodeMap[list[list.length-1]])

                if (_.every(parentCollections, (c) => !c || c.collapsed)) {
                    return false
                }

                // const parentCollection = nodeMap[c.collections[0]]
                // // not fetched yet, or collapsed
                // if (!parentCollection || parentCollection.collapsed) {
                //     return false;
                // }
                //
                return true;
            })
            .value()

        filteredCollections.forEach(c => {
            // TODO: improved performance by implementing the algorithm below , requires ability get all edges below a collection - 2017-09-20
            // instead of iterating through all edges
            /*
             * Collapsed x => 
             * 1. Hide all nodes under x
             * 2. Show x
             * 3. For every edge e with e.start below x OR e.end below x =>
             *    * If only e.start below x => update e.start to x.id
             *    * If only e.end below x => update e.end to x.id
             *    * If both e.start, e.end below x => hide e
             *
             * Expanded x => 
             * 1. Show direct children
             * 2. hide x
             * 3. continue with children
            */

            if (c.collapsed) {
                /*
                 * Hide nodes that are not expanded due to another collection
                 */

                // returns node ids for this collection (not all, just the ones that were fetched)
                const nodeIds = allNodesByCollectionId[c.id] || []

                nodeIds.forEach(n => {
                    // TODO: need to account for case where node is part of two collections and hidden by one, shown by the other
                    if (visibleNodeMap[n]) {
                        delete visibleNodeMap[n]
                    }
                    hiddenNodeMap[n] = n
                })

                // collapsed, no children
                c.children = []

                // visibleCollections.push(c)
                visibleCollections.push(c)

                // TODO: more performant - 2017-07-13
                transformedEdges = _(transformedEdges)
                    .map((e) => {
                        if (visibleNodeMap[e.start] && visibleNodeMap[e.end]) {
                            // this link is in the graph directly, no need to alter edges
                            // console.log("LINK IS IN GRAPH DIRECTLY");
                            return e;
                        }

                        // if start is hidden, change start to this collection
                        if (hiddenNodeMap[e.start]) {
                            // console.log("CHANGING START");
                            e.start = c.id
                        }
                        if (hiddenNodeMap[e.end]) {
                            // console.log("CHANGING END");
                            e.end = c.id
                        }
                        if (e.start === e.end) {
                            // console.log("BOTH INSIDE THE SAME ABSTRACTION");
                            return null
                        }

                        return e
                    })
                    .filter(x => x !== null)
                    .value()
            }

            else {
                /*
                 * 1. Determine which nodes should be hidden
                 * 2. Show the nodes that are not hidden
                 */

                const allChildNodes = allNodesByCollectionId[c.id] || []
                allChildNodes.forEach(n => {
                    visibleNodeMap[n] = n
                })
                c.children = _(nodesByCollectionId[c.id] || [])
                    .map(id => nodeMap[id])
                    .orderBy(n => n.name.toLowerCase())
                    .orderBy(n => n.type)
                    .value()

                // hide direct edges from/to this collection
                transformedEdges = _(transformedEdges)
                    .filter((e) => {
                        // TODO: should only happen for direct edges - 2017-07-14
                        if (e.start === c.id) {
                            return false
                        }

                        if (e.end === c.id) {
                            return false

                        }

                        return true
                    })
                    .value()
            }
        })

        const nodeTree = {
            ...parentCollection,
            children: _(nodesByCollectionId[parentCollection.id] || [])
                .map(id => nodeMap[id])
                .orderBy(n => n.name.toLowerCase())
                .orderBy(n => n.type)
                .value()
        }

        console.log(nodeTree)

        const visibleNodes = nodes
            .filter(n => !!visibleNodeMap[n.id])
            .map(n => nodeMap[n.id])

        // console.log(visibleNodes, visibleCollections, transformedEdges)

        return {
            nodes: visibleNodes,
            collections: filteredCollections,
            visibleCollections,
            edges: transformedEdges,
            nodeTree: nodeTree.children,
        }
    }
)

// TODO: more fine-grained syncing information - 2017-08-26
export const isSynced = (state) => !state.synced

