/*
 *
 * CollectionDetail
 *
 */

import React from 'react';
import { connect } from 'react-redux';

import NodeGraph from '../../components/NodeGraph'
import AddButton from '../../components/AddButton'
import Spinner from '../../components/Spinner'
import AddNodeWindow from '../../components/AddNodeWindow'
import EditModeButton from '../../components/EditModeButton'
import FocusButton from '../../components/FocusButton'
import FetchNodeButton from '../../components/FetchNodeButton'

import './styles.scss'

import {
    loadNode,
    loadCollection,
    connectNodes,
    updateNode
} from '../../actions/async'

import {
    addNode,
    showAddNodeToCollectionWindow,
    toggleEditMode,
    setActiveNode,
} from '../../actions/ui'

const AddNodeToCollectionButton = (props) => (
    <AddButton 
        onTouchTap={() => props.showAddNodeToCollectionWindow()}
    />
)

const defaultNode = {
    name: "Untitled"
}

export const NoNodesYet = (props) => (
    <div className="collectionDetail-noNodesYet">
        <span className="collectionDetail-noNodesYet-text">
            This collection has no nodes yet<br/>Click <span className="collectionDetail-noNodesYet-start" onClick={() => props.createNode(defaultNode)}>here</span> to add a node.
        </span>
    </div>
)


function loadData(props) {
    return props.loadCollection(props.collectionId)
        .then((action) => {
            if (props.nodeId) {
                props.loadNode(props.nodeId)
                return action
            }

            return action
        })
}


export class CollectionDetail extends React.Component { // eslint-disable-line react/prefer-stateless-function

    componentWillMount() {
        loadData(this.props)
    }

    componentWillReceiveProps(nextProps) {
        if (nextProps.collectionId !== this.props.collectionId) {
            loadData(nextProps)
        }

        // if (nextProps.nodeId !== this.props.nodeId) {
        //     this.props.loadNode(nextProps.nodeId)
        // }

    }

    render() {
        const {
            nodeId,
            collectionId,
            collection,
            nodes,
            links,
            loadingStates,
            focus,
            mode,
            nodeWindow 
        } = this.props

        if (loadingStates.GET_COLLECTION || loadingStates.GET_NODE) {
            return <Spinner />
        }

        return (
            <div className='appContainer'>
                <AddNodeWindow opened={mode === 'edit'} collectionId={collectionId} />
                {
                    nodes.length ?
                        <NodeGraph 
                            nodes={nodes || []}
                            links={links || []}
                            collectionId={this.props.collectionId} 
                            selectedId={this.props.nodeId}
                            graphType="collectionDetail"
                            mode={mode}
                            focus={focus}
                            addNode={this.props.addNode}
                            connectNodes={this.props.connectNodes}
                            updateNode={this.props.updateNode}
                            setActiveNode={this.props.setActiveNode}
                        />
                        : <NoNodesYet createNode={() => this.props.showAddNodeToCollectionWindow({ collection })}/>
                }
                <div className="graphActions">
                    <FocusButton />
                    <FetchNodeButton />
                </div>
                <div className="editModeButton-container">
                    <EditModeButton />
                </div>
            </div>

        );
    }
}

import {
    getCollection,
    isSynced,
    getNodesByCollectionId,
    getEdgesByCollectionId,
} from '../../reducers'

function mapStateToProps(state, props) {
    const collectionId = props.match.params && props.match.params.id
    const nodeId = props.match.params && props.match.params.nodeId

    return {
        collectionId,
        nodeId,
        mode: state.graphUiState.mode,
        focus: state.graphUiState.focus,
        nodeWindow: state.graphUiState.addNode,
        nodes: getNodesByCollectionId(state, collectionId),
        collection: getCollection(state, collectionId),
        links: getEdgesByCollectionId(state, collectionId),
        saved: isSynced(state),
        loadingStates: state.loadingStates
    }
}

export default connect(mapStateToProps, {
    loadCollection,
    loadNode,
    showAddNodeToCollectionWindow,
    addNode,
    connectNodes,
    updateNode,
    setActiveNode,
})(CollectionDetail);
