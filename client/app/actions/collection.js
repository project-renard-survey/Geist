import { normalize, Schema, arrayOf } from 'normalizr'
import Schemas from '../schemas'
import { CALL_API } from '../middleware/api'

import {
    getNode,
    getCollection,
 } from '../reducers'

const uuidV4 = require('uuid/v4');

import { convertNodeToCollection, loadNodeL1 } from './node'

/*
 * Get all collections
*/
export const GET_COLLECTIONS_REQUEST = 'GET_COLLECTIONS_REQUEST'
export const GET_COLLECTIONS_SUCCESS = 'GET_COLLECTIONS_SUCCESS'
export const GET_COLLECTIONS_FAILURE = 'GET_COLLECTIONS_FAILURE'
export function fetchCollections() {
    /*
     * Fetches all abstractions and their Abstract edges
    */
    return {
        [CALL_API]: {
            types: [ GET_COLLECTIONS_REQUEST, GET_COLLECTIONS_SUCCESS, GET_COLLECTIONS_FAILURE ],
            endpoint: 'Collection.getAll',
            schema: {
                collections: Schemas.NODE_ARRAY,
                edges: arrayOf(Schemas.COLLECTION_EDGE)
            }
        }
    }
}


/*
 * get the collection and its children
*/
export const GET_COLLECTION_REQUEST = 'GET_COLLECTION_REQUEST'
export const GET_COLLECTION_SUCCESS = 'GET_COLLECTION_SUCCESS'
export const GET_COLLECTION_FAILURE = 'GET_COLLECTION_FAILURE'
export function fetchCollection(id) {
    return {
        [CALL_API]: {
            types: [ GET_COLLECTION_REQUEST, GET_COLLECTION_SUCCESS, GET_COLLECTION_FAILURE ],
            endpoint: 'Collection.get',
            payload: [ id ],
            schema: {
                collection: Schemas.COLLECTION,
                // nodes: arrayOf(Schemas.NODE),
                edges: arrayOf(Schemas.EDGE),
            }
        }
    }
}

/*
 * Get the root collection, direct children and their neighbouring nodes (including edges)
*/
export const FETCH_ROOT_COLLECTION_REQUEST = 'FETCH_ROOT_COLLECTION_REQUEST'
export const FETCH_ROOT_COLLECTION_SUCCESS = 'FETCH_ROOT_COLLECTION_SUCCESS'
export const FETCH_ROOT_COLLECTION_FAILURE = 'FETCH_ROOT_COLLECTION_FAILURE'
export function fetchRootCollection(id, collectionChainIds) {
    return {
        [CALL_API]: {
            types: [ FETCH_ROOT_COLLECTION_REQUEST, FETCH_ROOT_COLLECTION_SUCCESS, FETCH_ROOT_COLLECTION_FAILURE ],
            endpoint: 'Collection.getRoot',
            payload: [ id, collectionChainIds ],
            schema: {
                collectionChain: arrayOf(Schemas.NODE),
                nodes: arrayOf(Schemas.NODE),
                edges: arrayOf(Schemas.EDGE),
            }
        }
    }
}

/*
 * Get collection, direct children and their neighbouring nodes (including edges)
*/
export const GET_COLLECTIONL1_REQUEST = 'GET_COLLECTIONL1_REQUEST'
export const GET_COLLECTIONL1_SUCCESS = 'GET_COLLECTIONL1_SUCCESS'
export const GET_COLLECTIONL1_FAILURE = 'GET_COLLECTIONL1_FAILURE'
export function fetchCollectionL1(id, collectionChainIds) {
    return {
        [CALL_API]: {
            types: [ GET_COLLECTIONL1_REQUEST, GET_COLLECTIONL1_SUCCESS, GET_COLLECTIONL1_FAILURE ],
            endpoint: 'Collection.getL1',
            payload: [ id, collectionChainIds ],
            schema: {
                collectionChain: arrayOf(Schemas.NODE),
                nodes: arrayOf(Schemas.NODE),
                edges: arrayOf(Schemas.EDGE),
            }
        }
    }
}
export function loadCollectionL1(id, collectionChainIds) {
    /*
     * Check if we have node in cache already, if not, fetch it first
     * case 1: new node, no need to fetch neighbours
     * case 2: existing node, need to add neighbours
    */
    return (dispatch, getState) => {
        return dispatch(fetchCollectionL1(id, collectionChainIds))
        // const collection = getCollection(getState(), id)
        //
        // if (cache) {
        //     return !collection ? dispatch(fetchCollectionL1(id)) : Promise.resolve(collection)
        // }
        // else {
        //     return dispatch(fetchCollectionL1(id))
        // }
    }
}

/*
 * Create a collection
*/
export const CREATE_COLLECTION_REQUEST = 'CREATE_COLLECTION_REQUEST'
export const CREATE_COLLECTION_SUCCESS = 'CREATE_COLLECTION_SUCCESS'
export const CREATE_COLLECTION_FAILURE = 'CREATE_COLLECTION_FAILURE'
export function createCollection(id, parentId, data) {
    // const id = uuidV4();

    return {
        id,
        parentId,
        [CALL_API]: {
            types: [ CREATE_COLLECTION_REQUEST, CREATE_COLLECTION_SUCCESS, CREATE_COLLECTION_FAILURE ],
            endpoint: 'Collection.create',
            payload: [ id, parentId, data ],
            schema: Schemas.COLLECTION
        }
    }
}

export const REMOVE_COLLECTION_REQUEST = 'REMOVE_COLLECTION_REQUEST'
export const REMOVE_COLLECTION_SUCCESS = 'REMOVE_COLLECTION_SUCCESS'
export const REMOVE_COLLECTION_FAILURE = 'REMOVE_COLLECTION_FAILURE'
export function fetchRemoveAbstraction(collectionId) {
    /*
     * This converts the abstraction to a node and the edges to normal edges
    */
    return {
        collectionId,
        [CALL_API]: {
            types: [ REMOVE_COLLECTION_REQUEST, REMOVE_COLLECTION_SUCCESS, REMOVE_COLLECTION_FAILURE ],
            endpoint: 'Collection.remove',
            payload: [ collectionId ],
        }
    }
}
export function removeAbstraction(collectionId, collectionChainIds) {
    /*
     * 1. Fetch direct child nodes of ${collectionId}
     * 2. Move abstraction with ${collectionId} to ${sourceCollectionId}
    */
    return (dispatch, getState) => {
        // get the direct child nodes,
        // TODO: must be merged with previous
        // TODO: should be getCollection?
        return dispatch(fetchCollectionL1(collectionId, collectionChainIds))
            .then(() => {
                return dispatch(fetchRemoveAbstraction(collectionId))
            })
    }
}

/*
 * add node with id ${nodeId} to collection with id ${collectionId}
*/
export const ADD_NODE_TO_COLLECTION_REQUEST = 'ADD_NODE_TO_COLLECTION_REQUEST'
export const ADD_NODE_TO_COLLECTION_SUCCESS = 'ADD_NODE_TO_COLLECTION_SUCCESS'
export const ADD_NODE_TO_COLLECTION_FAILURE = 'ADD_NODE_TO_COLLECTION_FAILURE'
export function fetchAddNodeToCollection(collectionId, nodeId, collectionChains) {
    const id = uuidV4();

    return {
        collectionId,
        nodeId,
        collectionChains,
        [CALL_API]: {
            types: [ ADD_NODE_TO_COLLECTION_REQUEST, ADD_NODE_TO_COLLECTION_SUCCESS, ADD_NODE_TO_COLLECTION_FAILURE ],
            endpoint: 'Collection.addNode',
            payload: [ collectionId, nodeId, id ],
            // schema: Schemas.COLLECTION_EDGE,
        }
    }
}
export function addNodeToCollection(collectionId, nodeId) {
    /*
     * Check if we have node in cache already, if not, fetch it first
     * case 1: new node, no need to fetch neighbours
     * case 2: existing node, need to add neighbours
    */
    // TODO: should be tested separately - 2017-08-25
    // this makes sure the right state is present in order to be able to merge the resulting state
    return (dispatch, getState) => {
        const collection = getCollection(getState(), collectionId)
        const node = getNode(getState(), nodeId)

        // TODO just use fetchNode()
        const collectionPromise = !collection ? dispatch(fetchCollectionL1(collectionId)) : Promise.resolve(collection)
        // const collectionPromise = dispatch(fetchCollectionL1(collectionId))
        // this fetches the neighbours as well (why?)
        const nodePromise = !node ? dispatch(loadNodeL1(nodeId)) : Promise.resolve(node)

        // first convert to a collection if the source is a node
        const convertToCollection = collection.type === "node"
            ? dispatch(convertNodeToCollection(collectionId)) : Promise.resolve()

        return Promise.all([ collectionPromise, nodePromise, convertToCollection ])
            .then(() => {
                const { collectionChains } = getCollection(getState(), collectionId)
                const newCollectionChains = collectionChains.map(chain => [ ...chain, collectionId ])

                return dispatch(fetchAddNodeToCollection(collectionId, nodeId, newCollectionChains))
            })
    }
}

/*
 * remove node with id ${nodeId} from collection with id ${collectionId}
*/
export const REMOVE_NODE_FROM_COLLECTION_REQUEST = 'REMOVE_NODE_FROM_COLLECTION_REQUEST'
export const REMOVE_NODE_FROM_COLLECTION_SUCCESS = 'REMOVE_NODE_FROM_COLLECTION_SUCCESS'
export const REMOVE_NODE_FROM_COLLECTION_FAILURE = 'REMOVE_NODE_FROM_COLLECTION_FAILURE'
export function removeNodeFromCollection(collectionId, nodeId) {
    return {
        collectionId,
        nodeId,
        [CALL_API]: {
            types: [ REMOVE_NODE_FROM_COLLECTION_REQUEST, REMOVE_NODE_FROM_COLLECTION_SUCCESS, REMOVE_NODE_FROM_COLLECTION_FAILURE ],
            endpoint: 'Collection.removeNode',
            payload: [ collectionId, nodeId ],
        }
    }
}


export const MOVE_TO_ABSTRACTION_REQUEST = 'MOVE_TO_ABSTRACTION_REQUEST'
export const MOVE_TO_ABSTRACTION_SUCCESS = 'MOVE_TO_ABSTRACTION_SUCCESS'
export const MOVE_TO_ABSTRACTION_FAILURE = 'MOVE_TO_ABSTRACTION_FAILURE'
export function fetchMoveToAbstraction(sourceCollectionId, sourceId, targetId, edgeId, sourceNode, collectionChains) {
    return {
        sourceCollectionId,
        sourceId,
        targetId,
        edgeId,
        sourceNode, // TODO: don't pass down?
        collectionChains,
        [CALL_API]: {
            types: [ MOVE_TO_ABSTRACTION_REQUEST, MOVE_TO_ABSTRACTION_SUCCESS, MOVE_TO_ABSTRACTION_FAILURE ],
            endpoint: 'Collection.moveNode',
            payload: [ sourceCollectionId, sourceId, targetId, edgeId ],
            // schema: {
            //     node: Schemas.NODE,
            // },
        }
    }
}
/*
 * change the abstract edge to point to the given target collection
*/
export function moveToAbstraction(sourceCollectionId, sourceId, targetId) {
    const edgeId = uuidV4()

    return (dispatch, getState) => {
        const source = getNode(getState(), sourceId)
        const target = getNode(getState(), targetId)

        const convertPromise = target.type === "node"
            ? dispatch(convertNodeToCollection(targetId)) : Promise.resolve()

        return convertPromise.then(() => {
            const { collectionChains } = getCollection(getState(), targetId)
            const newCollectionChains = collectionChains.map(chain => [ ...chain, targetId ])

            return dispatch(fetchMoveToAbstraction(sourceCollectionId, sourceId, targetId, edgeId, source, newCollectionChains))
        })
    }
}



