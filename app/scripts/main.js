"use strict";


// (S)CSS...
require("!style!css!./../styles/normalize.css");
require("!style!css!./../styles/skeleton.css");
require("!style!css!sass!./../styles/main.scss");

import { hasClass, replaceClass } from "./domhelpers";
import { route, processRoute } from "./routing";

// Store global letiables locally when ever they"re called more than once
let google = require("googlemaps");
let doc = document;

let startInput, endInput, errorMessage;
let geocoder;
let map;
const london = new google.maps.LatLng(51.5072, 0.1275);

function newMap(latLng){
  let startingPoint = latLng || london;
  let mapOptions = { zoom: 10, center: startingPoint };
  return new google.maps.Map(doc.getElementById("map-canvas"), mapOptions);
}

function enableSearchForm(failureText){
  startInput.removeAttribute("disabled");
  endInput.removeAttribute("disabled");
  if (failureText) {
    errorMessage.className = errorMessage.className.replace(/\s?hidden/, "");
  }
}

function clearErrorMessage(){
  if (!hasClass(errorMessage, "hidden")) {
    errorMessage.className += " hidden";
  }
}

function displayDirections(map){
  return function(state){
    Promise.all(state.rendererPrms)
    .then(function(directionRenderers){
      let directionPanels = doc.getElementById("directions-panels");
      let newDirectionPanel;

      directionPanels.innerHTML = "";

      // Remember bestRoute should be walked in reverse...
      for (let i = directionRenderers.length-1; i>=0; i--){
        directionRenderers[i].setMap(map);
        newDirectionPanel = doc.createElement("p");
        directionRenderers[i].setPanel(newDirectionPanel);
        directionPanels.appendChild(newDirectionPanel);
      }

      // Enable the search form for the next search.
      enableSearchForm();
    });
    return { bounds: state.bounds, map: map };
  };
}

function calcRouteHandler(e) {
  e.preventDefault();
  map = map || newMap();

  let start = startInput.value;
  let end = endInput.value;

  // Block the location inputs as we search for the route
  startInput.setAttribute("disabled", "disabled");
  endInput.setAttribute("disabled", "disabled");

  let request = {
    origin: start,
    destination: end,
    travelMode: google.maps.TravelMode.TRANSIT
  };


  route(request)
  // If an address can't be found unblock the search form with the reject message.
  .then(processRoute, enableSearchForm)
  .then(displayDirections(map))
  .then(state => state.map.fitBounds(state.bounds));
}

function showAddress(geocoderRequest){
  geocoder = geocoder || new google.maps.Geocoder();

  return new Promise(function(resolve, reject){
    geocoder.geocode(geocoderRequest, function(results, status){
      if (status === google.maps.GeocoderStatus.OK) {
        map = map || newMap(results[0].geometry.location);

        let marker = new google.maps.Marker({
          position: results[0].geometry.location,
          map: map
        });

        startInput.value = results[0].formatted_address;
        resolve(marker);
      } else {
        console.log("Geocoder failed due to: ", status);
        reject(status);
      }
    });
  });
}

class Throbber {
  constructor(options){
    this.icon = options.icon;

    this.off = replaceClass
    .bind(this, this.icon, "fa-circle-o-notch fa-spin", "fa-location-arrow");

    this.on = replaceClass
    .bind(this, this.icon, "fa-location-arrow", "fa-circle-o-notch fa-spin");
  }
}

function geolocationHandler(throbber){
  return function(e){
    e.preventDefault();
    throbber.on();
    clearErrorMessage();
    startInput.setAttribute("disabled", "disabled");
    startInput.value = "";

    window.navigator.geolocation.getCurrentPosition(function(position){
      let latlng = new google.maps.LatLng(
        position.coords.latitude,
        position.coords.longitude
      );

      showAddress({latLng: latlng})
      .then(throbber.off);

      doc.getElementById("end").focus();
    });
  };
}

function showAddressHandler(throbber){
  return function(e){
    clearErrorMessage();

    if (e.keyCode === 13) {
      e.preventDefault();
      throbber.on();
      showAddress({address: e.currentTarget.value})
      .then(throbber.off, enableSearchForm)
      .then(function(){endInput.focus();}, throbber.off);
    }
  };
}

function initialize() {
  let geolocationBtn = doc.getElementById("geolocation-btn");
  let geolocationThrobber = new Throbber({icon: geolocationBtn.childNodes[0]});

  let startingPointHandler = showAddressHandler(geolocationThrobber);

  geolocationBtn.addEventListener("click", geolocationHandler(geolocationThrobber));
  geolocationBtn.addEventListener("keypress", startingPointHandler);


  endInput = doc.getElementById("end");
  startInput = doc.getElementById("start");
  startInput.focus();
  errorMessage = doc.getElementById("error-message");

  startInput.addEventListener("keypress", startingPointHandler);

  endInput.addEventListener("keypress", function(event) {
    clearErrorMessage();
    if (event.keyCode === 13) { calcRouteHandler(event); }
  });

  let searchForm = doc.getElementById("search-form");
  searchForm.addEventListener("submit", calcRouteHandler);
}

google.maps.event.addDomListener(window, "load", initialize);
