import google from "googlemaps";
import Graph from "./graph";

function nonWakingSteps(steps){
  return steps.filter(s => s.travel_mode !== google.maps.TravelMode.WALKING);
}

function bikeOrigins(steps){
  var origins = [];
  var firstStep = steps[0];
  var lastStep = steps[steps.length-1];

  // If the last step is walking add its end point.
  if (firstStep.travel_mode === google.maps.TravelMode.WALKING) {
    origins.push(firstStep);
  }

  origins = origins.concat(nonWakingSteps(steps));

  // If the last step is walking add its end point too.
  if (lastStep.travel_mode === google.maps.TravelMode.WALKING) {
    origins.push(lastStep);
  }

  return origins.map(s => s.start_location);
}

function bikeDestinations(steps){
  var destinations = nonWakingSteps(steps);

  var lastStep = steps[steps.length-1];

  // If the last step is walking add its end point.
  if (lastStep.travel_mode === google.maps.TravelMode.WALKING) {
    destinations.push(lastStep);
  }

  return destinations.map(s => s.end_location);
}

function distanceMatrix(request){
  let distanceService = new google.maps.DistanceMatrixService();
  return new Promise(function(resolve, reject) {
    distanceService.getDistanceMatrix(request, function(response, status) {
      if (status === google.maps.GeocoderStatus.OK) {
        resolve(response);
      } else {
        reject(status);
      }
    });
  });
}

function newRendererPrm(response){
  let directionRenderer = new google.maps.DirectionsRenderer({
    preserveViewport: true,
    suppressMarkers: true
  });

  let directionPrm = new Promise(function(resolve){
    google.maps.event.addListener(directionRenderer, "directions_changed", function() {
      resolve(directionRenderer);
    });
  });

  directionRenderer.setDirections(response);
  return directionPrm;
}

function addBikeStylingToRenderer(directionRenderer){
  directionRenderer.setOptions({
    polylineOptions: {
      strokeColor: "green",
      strokeWeight: 6
    }
  });
}

function orLogFailure(status){
  console.log(status);
}

export function route(request){
  let directionsService = new google.maps.DirectionsService();

  let routePrm = new Promise((resolve, reject)=>{
    directionsService.route(request, function(response, status) {
      if (status === google.maps.DirectionsStatus.OK) {
        resolve(response);
      } else {
        reject(status);
      }
    });
  });

  return routePrm;
}


export function processRoute(transitResponse) {
  let transitSteps = transitResponse.routes[0].legs[0].steps;
  let routeGraph = new Graph(transitSteps);

  let distanceRequest = {
    origins: bikeOrigins(transitSteps),
    destinations: bikeDestinations(transitSteps),
    travelMode: google.maps.TravelMode.BICYCLING
  };

  // Filter out any destination within 100m of any other destination.
  let origin;
  let destination;
  for (let i=0,len=distanceRequest.destinations.length;i<len;i++){
    for (let j=0,lenj=distanceRequest.origins.length;j<lenj;j++){
      origin = distanceRequest.origins[j];
      destination = distanceRequest.destinations[i];

      if(google.maps.geometry.spherical.computeDistanceBetween(origin,destination) <= 100){
        distanceRequest.destinations[i] = origin;
      }
    }
  }

  return distanceMatrix(distanceRequest)
  .then(function(response) {
    routeGraph.addVertexsFromDistances(distanceRequest, response);

    routeGraph.findBestRoute();
    console.log(routeGraph.toGraphViz());

    // Centre the resulting route in the map window.
    var bounds = new google.maps.LatLngBounds();

    routeGraph.bestRoute.forEach(function(edge) {
      bounds.extend(edge.startLocation.latlng);
      bounds.extend(edge.endLocation.latlng);
    });


    let rendererPrms = routeGraph.bestRoute
    .map(function(edge){
      let rendererPrm = route({
        origin: edge.startLocation.latlng,
        destination: edge.endLocation.latlng,
        travelMode: edge.travelMode
      })
      .then(newRendererPrm, orLogFailure);

      if (edge.travelMode === google.maps.TravelMode.BICYCLING){
        rendererPrm.then(addBikeStylingToRenderer);
      }

      return rendererPrm;
    });

    return { bounds: bounds, rendererPrms: rendererPrms };
  });
}
