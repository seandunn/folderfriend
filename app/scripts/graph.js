import google from "googlemaps";

let vertexCount = 0;

class Vertex {
  constructor(options) {
    this.graph = options.graph;
    this.latlng = options.latlng;
    this.leaving = [];
    this.label = function(){return this.latlng.toString();};
    this.address = "";
    this.timeFromRoot = Infinity;

    vertexCount +=1;
    this._id = vertexCount;
  };

  hasEdgeTo(endVertex){
    let endVertexLabel = endVertex.label();
    return this.leaving.some(v=>v.endLocation.label() === endVertexLabel);
  }

  edgeTo(options){
    let edge = new Edge({
      graph: this.graph,
      startLocation: this,
      endLocation: options.destination,
      travelMode: options.travelMode,
      duration: options.duration
    });

    this.leaving.push(edge);
    this.graph.edges.push(edge);
  }

  setAddress(address){
    if (this.address === ""){
      this.address = address;
    }
  }

  toString() {
    return "Node ID: "+this._id+" -- "+this.address+".  Time from root: "+this.timeFromRoot;
  }
}

let edgeCount = 0;
class Edge {
  constructor(options) {
    this.graph = options.graph;
    this.startLocation = options.startLocation;
    this.endLocation = options.endLocation;
    this.travelMode = options.travelMode;
    this.duration = options.duration;
    this.onFastPath = false;
    edgeCount += 1;
    this._id = edgeCount;
  }

  toGraphViz(){
    let start = "\""+this.startLocation._id+". "+this.startLocation.address+"\"";
    let end = "\""+this.endLocation._id+". "+this.endLocation.address+"\"";

    let edgeStyle =  " [label=\""+this.travelMode+" "+this.duration.text+"\"";
    let style = " color=gray"
    let fastStyle = " color=green style=bold"

    let dot = "";

    if (this.onFastPath){
      style = fastStyle;
      dot += start + " ["+style+"]\n;";
    }

    if (this.endLocation === this.graph.finalDestination){
      dot += end + " ["+fastStyle+"];\n";
    }

    dot += start+" -> " + end + edgeStyle + style+" ]\n";

    return dot;
  }
}

export default class Graph {
  constructor(steps){
    this.vertexs = {};
    this.edges = [];
    this.bestRoute = [];

    var startLocation;
    var endLocation;
    var edge;

    for (let i=0,len=steps.length;i<len;i++) {
      startLocation = this.findOrAddVertex(steps[i].start_location);
      if (i===0) { this.root = startLocation; }

      endLocation = this.findOrAddVertex(steps[i].end_location);
      if (i===len-1) { this.finalDestination = endLocation; }

      startLocation.edgeTo({
        destination: endLocation,
        travelMode: steps[i].travel_mode,
        duration: steps[i].duration
      });
    }
  }

  findOrAddVertex(latlng){
    let vertexName = latlng.toString();
    if (this.vertexs[vertexName] === undefined) {
      this.vertexs[vertexName] = new Vertex({
        graph: this,
        latlng: latlng
      });
    }
    return this.vertexs[vertexName];
  }

  addVertexsFromDistances(distanceRequest, distanceResponse){
    // Walk across the origins...
    let startVertex;
    let endVertex;

    for (let i=0, len=distanceRequest.origins.length;i<len;i++){
      startVertex = this.vertexs[distanceRequest.origins[i].toString()];
      startVertex.setAddress(distanceResponse.originAddresses[i]);

      for (let j=0, lenj=distanceRequest.destinations.length;j<lenj;j++){
        endVertex = this.vertexs[distanceRequest.destinations[j].toString()];
        endVertex.setAddress(distanceResponse.destinationAddresses[j]);

        // Filter loops from the graph
        if (startVertex !== endVertex){
          startVertex.edgeTo({
            destination: endVertex,
            travelMode: google.maps.TravelMode.BICYCLING,
            duration: distanceResponse.rows[i].elements[j].duration
          });
        }
      }
    }
  }

  findBestRoute(){
    let candidates = [];
    let currentEdge;
    let newDuration;
    this.root.timeFromRoot = 0;

    // Start with all the edges leaving the root location.
    candidates = candidates.concat(this.root.leaving);

    while (candidates.length > 0) {
      // pop the first candidateEdge
      currentEdge = candidates.splice(0,1)[0];
      newDuration = currentEdge.startLocation.timeFromRoot + currentEdge.duration.value;

      if (newDuration < currentEdge.endLocation.timeFromRoot) {
        currentEdge.endLocation.quickestEdgeIn = currentEdge;
        currentEdge.endLocation.timeFromRoot = newDuration;

        // Add the edges leaving the location at the end of our currentEdge to
        // the candidates list.
        candidates = candidates.concat(currentEdge.endLocation.leaving);
      }
    }


    // Walk the quickest route back to start.
    let currentVertex = this.finalDestination;
    this.bestRoute = [];
    while(currentVertex.quickestEdgeIn){
      currentVertex.quickestEdgeIn.onFastPath = true;
      this.bestRoute.push(currentVertex.quickestEdgeIn);
      currentVertex = currentVertex.quickestEdgeIn.startLocation;
    }
  }

  toGraphViz(){
    let dot = "digraph G {\n"
    for (let i=0,len=this.edges.length;i<len;i++){
      dot += this.edges[i].toGraphViz()+"\n";
    }
    dot += "}\n"

    return dot;
  }
}
