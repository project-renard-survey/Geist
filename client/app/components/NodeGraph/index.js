import _ from 'lodash'
import React, { PropTypes } from 'react'
import ReactDOM from 'react-dom'

// TODO: only import things you need - 2016-07-25
import * as d3 from 'd3'
import './styles.css'

import { browserHistory } from 'react-router-dom'

import createZoom from '../../graph/zoom'
import createSimulation from '../../graph/simulation'
import { arrowHead } from '../../graph/svgdefs.js'
import { NODE_RADIUS, WIDTH, HEIGHT } from '../../graph/constants'
import createDrag from '../../graph/drag'
import createEvents from '../../graph/events'
import createCustomEvents from './events'
import createLinkUpdates from '../../graph/link'
import createNodeUpdates from '../../graph/node'
import {colorActiveNode } from '../../graph/util'

class NodeOverviewGraph extends React.Component {
    constructor(props) {
        super(props)

        this.update = this.update.bind(this)
    }

    update(nextProps) {
        /*
         * Go through the enter,update,exit cycle
        */
       // TODO: avoid class methods for these types of things- 2016-06-19

        let { nodes, links } = nextProps

        const nodeById = d3.map()

        // set extra properties here
        nodes.forEach(node => {
            nodeById.set(node.id, node)
        })

        links.forEach(link => {
            link.source = nodeById.get(link.start)
            link.target = nodeById.get(link.end)
        })

        var node = this.d3Graph.selectAll('.node')
            // .data(nodes, node => node.id + "_" + node.properties.modified)
            .data(nodes, node => node.id)

        // EXIT selection
        node.exit().call(this.nodeUpdates.exitNode)
        // ENTER selection
        node.enter().append('g').call(this.nodeUpdates.enterNode).call(this.nodeDrag)
            // ENTER + UPDATE selection
            .merge(node).call(this.nodeUpdates.updateNode)
            // .merge(node).call((selection) => this.nodeUpdates.updateNode(selection, { selectedNode: this.props.selectedNode }))

        var link = this.d3Graph.selectAll('.node-link')
            .data(links, link => link.id)

        // EXIT selection
        link.exit().remove()
        // ENTER selection
        link.enter().insert('g', ":first-child").call(this.linkUpdates.enterLink)
            // .merge(link).call(updateLink)

        this.simulation.nodes(nodes)
            // .on("tick", () => {
            //     this.d3Graph.call(ticked)
            // })

        this.simulation.force("link")
            .links(links)

        if (nodes.length !== this.props.nodes.length || links.length !== this.props.links.length) {
            this.simulation.alpha(0.8).restart();
        }
    }

    componentDidMount() {
        const { loadNode, removeEdge, showGraphSideBar, connectNodes, changeMainFocus } = this.props

        this.d3Graph = d3.select(ReactDOM.findDOMNode(this.refs.graph));
        this.d3Graph
            .append('defs')
            .call(arrowHead)

        const { simulation, ticked } = createSimulation(WIDTH, HEIGHT)
        this.simulation = simulation
        this.ticked = ticked

        this.zoom = createZoom(this.d3Graph, WIDTH, HEIGHT)

        this.events = createEvents({
            loadNode,
            removeEdge,
            showGraphSideBar,
            changeMainFocus
        })
        this.customEvents = createCustomEvents({
            loadNode,
            removeEdge,
            showGraphSideBar,
            changeMainFocus,
            history: this.props.history,
        })

        this.drag = createDrag(this.simulation)({ 
            connect: connectNodes,
            click: this.customEvents.nodeClick
        })
        this.nodeDrag = d3.drag()
            .on('drag', this.drag.drag.bind(this))
            .on('start', this.drag.dragstart.bind(this))
            .on('end', this.drag.dragend.bind(this))

        const nodeEnterEvents = [
            // this.customEvents.nodeClick   
        ]

        this.nodeUpdates = createNodeUpdates({
            events: this.customEvents,
            zoom: this.zoom,
            paddingPercent: 0.95,
        })(nodeEnterEvents)
        this.linkUpdates = createLinkUpdates(this.events)()

        // append tooltip to the dom
        // this.d3Graph.call(nodeTooltip)
        // this.d3Graph.call(linkTooltip)

        this.update(this.props)

        this.simulation.on('tick', () => {
            // after force calculation starts, call updateGraph
            // which uses d3 to manipulate the attributes,
            // and React doesn't have to go through lifecycle on each tick
            this.d3Graph.call(this.ticked);
        });

        if (this.props.selectedNode) {
            colorActiveNode(d3.select(`#node-${this.props.selectedNode.id}`))
        }
    }

    shouldComponentUpdate(nextProps) {
        this.d3Graph = d3.select(ReactDOM.findDOMNode(this.refs.graph));

        this.update(nextProps)

        if (nextProps.selectedNode && nextProps.selectedNode !== this.props.selectedNode) {
            colorActiveNode(d3.select(`#node-${nextProps.selectedNode.id}`))
        }

        return false
    }

    render() {
        return (
            <div id="nodeOverviewGraph" className="svg-container">
                <svg 
                    viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
                    preserveAspectRatio="xMidYMid meet"
                    className="svg-content"
                >
                    <g ref='graph' />
                </svg>
        </div>

        )
    }
}
NodeOverviewGraph.propTypes = {
    nodes: PropTypes.arrayOf(PropTypes.object).isRequired,
    links: PropTypes.arrayOf(PropTypes.object).isRequired,

    connectNodes: PropTypes.func.isRequired,
}

import { withRouter } from 'react-router-dom'

export default withRouter(NodeOverviewGraph)
