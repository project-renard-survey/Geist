/*
 *
 * GraphView
 *
 */

import React, { PropTypes } from 'react';
import { connect } from 'react-redux';
import { withRouter } from 'react-router-dom'

import './styles.css'

import ForceGraph from '../../containers/ForceGraph'
import NodeToolbar from '../../containers/NodeToolbar'
import { AddButton, ClearButton } from '../../components/Buttons'
import Spinner from '../../components/Spinner'

const defaultNode = {
    name: "Untitled"
}

export const AddNodeShootButton = (props) => (
    <AddButton 
        onTouchTap={() => props.createNode(defaultNode)}
    />
)
AddNodeShootButton.propTypes = {
    createNode: PropTypes.func.isRequired
}

export const ClearBatchButton = (props) => (
    <ClearButton
        onTouchTap={() => props.clearBatchNodes()}
    />
)
ClearBatchButton.propTypes = {
    clearBatchNodes: PropTypes.func.isRequired
}

import { accentColor, darkAccentColor } from '../App/muitheme.js'

export const NoNodesYet = (props) => (
    <div className="nodeBatchCreate-noNodesYet">
        <span className="nodeBatchCreate-noNodesYet-text">
            Your inbox is empty!<br/>Click <span  className="nodeBatchCreate-noNodesYet-start" style={{color: darkAccentColor}} onClick={() => props.createNode(defaultNode)}>here</span> to create a node.
        </span>
    </div>
)


export class GraphView extends React.Component { // eslint-disable-line react/prefer-stateless-function

    constructor(props) {
        super(props)

        this.createBatchNode = this.createBatchNode.bind(this)
        this.clearBatchNodes = this.clearBatchNodes.bind(this)
    }


    componentDidMount() {
        /*
         * Nodes and edges from previous batch create session that hasn't been cleared yet.
         * // TODO: where to store batch sessions? - 2016-07-22
         */
        const { id } = this.props
        this.props.setTitle("Inbox")
        this.props.getAllBatchNodes()
            .then(action => {
                const nodeIds = action.response.result

                if (!nodeIds.length) return

                const lastModifiedNode = nodeIds[0]

                console.log(this.props);

                this.props.history.push(`/app/inbox/${lastModifiedNode}`)
            })
    }

    componentWillReceiveProps(nextProps) {
        // TODO: set active node if id is set - 2016-10-05
        if (nextProps.id && this.props.id !== nextProps.id) {
            this.props.loadNode(nextProps.id)
        }
    }

    createBatchNode(node) {
        this.props.createBatchNode(node)
            .then((action) => {
                this.props.history.push(`/app/inbox/${action.response.result}/`)
            })
    }

    clearBatchNodes() {
        const result = window.confirm("You want to clear the inbox? (This doesn't remove the nodes)")
        if (result) {
            this.props.clearBatchNodes()
            this.props.history.push(`/app/inbox/`)
            // .then(() => this.props.hideGraphSideBar())
        }
    }

    render() {
        const { nodes, links, selectedNode, loadingStates } = this.props

        if (loadingStates.GET_ALL_BATCH_NODES) {
            return <Spinner style={{ height: '80%' }} />
        }

        return (
            <div className="graphView">
                {
                    this.props.id ? // TODO: check for is integer instead - 2016-10-07
                        <NodeToolbar 
                            id={this.props.id}
                            page="inbox"
                        />
                        : null
                }
                {
                    nodes.length ?
                        <ForceGraph 
                            nodes={nodes}
                            links={links}
                            selectedNode={this.props.selectedNode}
                            graphType={'inbox'}
                        />
                        :
                        <NoNodesYet createNode={this.createBatchNode} />
                }
                <div className="nodeBatchCreate-buttons">
                    <AddNodeShootButton
                        createNode={this.createBatchNode}
                    />
                    <ClearBatchButton
                        clearBatchNodes={this.clearBatchNodes}
                    />
                </div>
            </div>
        );
    }
}

import { getNode, getBatchNodes, getEdgesForNodes } from '../../reducers.js'

function mapStateToProps(state, props) {
    const id = (props.params && props.params.id) || props.id

    const nodes = getBatchNodes(state)
    const selectedNode = getNode(state, id)

    return {
        id,
        nodes: nodes,
        links: getEdgesForNodes(state, _.map(nodes, node => node.id)),
        selectedNode,
        loadingStates: state.loadingStates,
    }
}

import { createBatchNode, clearBatchNodes, getAllBatchNodes, loadNode } from '../../actions/async'
import { setTitle } from '../../actions/ui'

export default connect(mapStateToProps, {
    createBatchNode,
    clearBatchNodes,
    getAllBatchNodes,
    loadNode,
    setTitle,
    showGraphSideBar,
    hideGraphSideBar,
})(withRouter(GraphView));
