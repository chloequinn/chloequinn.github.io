//global variables
var map; //map object
var csvData; //array of objects
var markersLayer; //markers layer group object
var timestamp; //initial timestamp
var scaleFactor = .3; //scale factor for marker area
var timer; //timer object for animation
var timerInterval = 1000; //initial animation speed in milliseconds


//begin script when window loads
window.onload = initialize(); //->

//the first function called once the html is loaded
function initialize(){
		//<-window.onload
		setMap(); //->			
};

//set basemap parameters
function setMap() {
		//<-initialize()
		
		//create the map and set its initial view
		map = L.map('map', {
    		center: [40, -99],
    		zoom: 5,
    		minZoom: 4,
    		maxZoom:6
    		});

		//add the tile layer to the map
		var layer = L.tileLayer(
			'http://{s}.acetate.geoiq.com/tiles/acetate/{z}/{x}/{y}.png',
			{
				attribution: 'Acetate tileset from GeoIQ'
		}).addTo(map);
		
		//Call processCSV and sequenceInteractions functions
		processCSV();
		sequenceInteractions();
};

			
function processCSV() {
		//<-setMap()
		
		//process the csvData csv file
		var processCSV = new ProcessCSV(); //-> to ProcessCSV.js
		var csv = 'data/csvData.csv'; // set location of csv file

		processCSV.addListener("complete", function(){
			csvData = processCSV.getCSV(); //-> to ProcessCSV.js
			createMarkers(csvData)
			});
		
		processCSV.process(csv); //-> to ProcessCSV.js
		
};
		
function createMarkers() {
		//<-processCSV()

		//radius of markers (doesn't matter what value is)
		var r = 10;

		//marker style object
		var markerStyle = {
			radius: r,
			fillColor: "#3B0000",
			color: "none"
		};

		//create array to hold markers
		var markersArray = [];

		//create a circle marker for each object in the csvData array
		for (var i=0; i<csvData.length; i++) {
			var feature = {};
			feature.properties = csvData[i];
			var lat = Number(feature.properties.latitude);
			var lng = Number(feature.properties.longitude);
			var marker = L.circleMarker([lat,lng], markerStyle);
			marker.feature = feature;
			markersArray.push(marker);
		};

		//create a markers layer with all of the circle markers
		markersLayer = L.featureGroup(markersArray);

		//add the markers layer to the map
		markersLayer.addTo(map);
		
		step(); 
		
		createMinMax();
};

function createMinMax(){

	var maxMarkerArray = [];
	var maxMarker, lat, lng, maxValue;
	markersLayer.eachLayer(function(layer){
		lat = layer._latlng.lat;
		lng = layer._latlng.lng;
		maxMarker = L.circleMarker([lat,lng]);
		maxValue = layer.feature.properties.maxValue * scaleFactor;
		maxMarker.setRadius(Math.sqrt(maxValue/Math.PI));
		maxMarker.setStyle({fillColor: "none", color: "#3E454C"});
		maxMarkerArray.push(maxMarker);
	});
	maxMarkersLayer = L.featureGroup(maxMarkerArray);

	
	var minMarkerArray = [];
	var minMarker, minValue;
	markersLayer.eachLayer(function(layer){
		lat = layer._latlng.lat;
		lng = layer._latlng.lng;
		minMarker = L.circleMarker([lat,lng]);
		minValue = layer.feature.properties.minValue * scaleFactor;
		minMarker.setRadius(Math.sqrt(minValue/Math.PI));
		minMarker.setStyle({fillColor: "none", color: "#590202"});
		minMarkerArray.push(minMarker);
	});
	minMarkersLayer = L.featureGroup(minMarkerArray);
	

	
	maxMinControls(maxMarkersLayer,minMarkersLayer);
}


function onEachFeature(layer) {
		//<-createMarkers()

		//calculate the area based on the data for that timestamp
		var area = layer.feature.properties[timestamp] * scaleFactor;

		//calculate the radius
		var radius = Math.sqrt(area/Math.PI);

		//set the symbol radius
		layer.setRadius(radius);
		
		if(layer.feature.properties.name == "Maryland"){
			layer.bringToFront();
		}
		
		//create and style the HTML in the information popup
		var popupHTML = "<b>" + layer.feature.properties[timestamp] + 
			" Million Cubic Feet</b><br>" + 
			"<i> " + layer.feature.properties.name +
			"</i> in <i>" + timestamp + "</i>";
			

		//bind the popup to the feature
		layer.bindPopup(popupHTML, {
			offset: new L.Point(0,-radius)
		}); 

		//information popup on hover
		layer.on({
			mouseover: function(){
				layer.openPopup();
				this.setStyle({radius: radius, color: "#7E9699", weight: "4"});
			},
			mouseout: function(){
				layer.closePopup();
				this.setStyle({color: "none"});
			}
		});
		
		return radius; //added from Rich's code
};

function updateLayers(){

	var radiusArray = [];
		//upon changing the timestamp, call onEachFeature to update the display

	markersLayer.eachLayer(function(layer) {
		var r = onEachFeature(layer);
		radiusArray.push(r);
	});
	
	updateLegend(radiusArray); //added from Rich's code
}

function updateLegend(rArray){

	// select the legendTitle html element and insert the current value of 
	// timestamp between two header tags 
	document.getElementById("legendTitle").innerHTML = "<h4>Methane Emissions (MMcf)</h4>";
	document.getElementById("legendYear").innerHTML = "<h4 style = 'margin-bottom: -30px;'>Year:</h4><h3>"+timestamp+"</h3>";
	document.getElementById("legendYear2").innerHTML = "Selected Year: " + timestamp;
	
	// select legendSymbols html element and store reference within JS var 
	var legendSymbols = document.getElementById('legendSymbols');
	
	
	var maxrad = Math.max.apply(null, rArray); // --  thnx Carl Sack
	var minrad = Math.min.apply(null, rArray);
	var midrad = (maxrad + minrad)/2;
	var legendArray = [maxrad, midrad, minrad];

	legendSymbols.innerHTML = '';  // clear the contents of legendSymbols elements (from last iteration)
	
	// create container svg element and append to legendSymbols 
	var legendSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
	legendSvg.setAttribute("version", "1.2");
	legendSvg.setAttribute("baseProfile", "tiny");
	legendSymbols.appendChild(legendSvg);
	
	// loop through the array of legend radius values andc create a new SVG circle for each 
	for (var i=0; i < legendArray.length; i++) {		
		c = document.createElementNS("http://www.w3.org/2000/svg", "circle"); // create element
		c.setAttribute("cx", 80);  // set horizonatal position
		c.setAttribute("cy", legendArray[i] - 140);  // set vertical position
		c.setAttribute("r", legendArray[i]);
		c.setAttribute("fill", "rgba(59, 0, 0, .2)");
		c.setAttribute("stroke", "none");
		c.setAttribute("stroke-width", 2);
		c.setAttribute("transform","scale(1,-1)");
		legendSvg.appendChild(c);
	}
	
	//reverse-calculate the legend marker radius to store values --  thnx Carl Sack
	var maximum = Math.round((Math.pow(maxrad,2)*Math.PI)/scaleFactor);
	//var median = Math.round((Math.pow(midrad,2)*Math.PI)/scaleFactor);
	var minimum = Math.round((Math.pow(minrad,2)*Math.PI)/scaleFactor);
	var median = Math.round((maximum + minimum)/2);
	var legendValues = [maximum, median, minimum];
	
	var legendData = document.getElementById("legendData");
	legendData.innerHTML = '';
	// loop through legendValues array values and insert each within legendData html div element
	for (var j=0;j < legendValues.length; j++){
		legendData.innerHTML += "<div>"+legendValues[j]+"</div>"
	}
}

//Sequencing Controls
function sequenceInteractions(){
		
	$(".pause").hide();
	
	//play behavior
	$(".play").click(function(){
		$(".pause").show();
		$(".play").hide();
		animateMap();
	});
	
	//pause behavior
	$(".pause").click(function(){
		$(".pause").hide();
		$(".play").show();
		stopMap();
	});

	//step behavior
	$(".step").click(function(){
		step();
	});
	
	//step-full behavior
	$(".step-full").click(function(){
		jump(2010); //update with last timestamp
	});
	
	//back behavior
	$(".back").click(function(){
		back();
	});
	
	//back-full behavior
	$(".back-full").click(function(){
		jump(1990); //update with first timestamp
	});
		
	//temporalSlider behavior	
	$("#temporalSlider").slider({
		min: 1990,
		max: 2010,
		step: 1,
		animate: "slow",
		slide: function(e, ui){
			stopMap();
			timestamp = ui.value;

			if (timestamp == 1991) {
				jump(1995);
			}
			if (timestamp == 1992) {
				jump(1995);
			}
			if (timestamp == 1993) {
				jump(1995);
			}
			if (timestamp == 1994) {
				jump(1995);
			}
			updateLayers();
			$( "#amount" ).val( "$" + ui.value );		
		}	
		
	});
	$( "#amount" ).val( "$" + $( "#temporalSlider" ).slider( "value" ) );

}

function animateMap() {
		//<-setMap();
		timer = setInterval(function(){
			step();
		},timerInterval); 
				
};

function stopMap() {
	clearInterval(timer);
}	

function step(){
		//<-animateMap()

		if (timestamp == 1990) { timestamp = 1994; }
		
		//cycle through years
		if (timestamp < 2010 ){ //update with last timestamp header
				timestamp++;
		}  		
		else {
				timestamp = 1990; //update with first timestamp header
		};
		
		updateLayers();
		updateSlider();

}

function back(){
	
	//cycle through years
	if (timestamp > 1990){ //update with first timestamp header
		timestamp--;
	} else {
		timestamp = 2010; //update with last timestamp header
	};	
	
	updateLayers();
	updateSlider();
}

function jump(t){
	
	//set the timestamp to the value passed in the parameter
	timestamp = t;
	
	updateLayers();
	updateSlider();
}

function updateSlider(){
	
	//move the slider to the appropriate value
	$("#temporalSlider").slider("value",timestamp);
}

function maxMinControls(maxLayer, minLayer){
	// function accepts two featureGroup layers and applies click listeners
	// to max and min buttons in the DOM, effectually toggling these buttons
	// on and off, and removing/adding the featureGroup layers respectively

	$("#maxButton").click(function(){
		if(map.hasLayer(maxLayer)){
			map.removeLayer(maxLayer);
			$("#maxButton").css("color","#7E9699");
		} else {
			map.addLayer(maxLayer);
			$("#maxButton").css("color","#3E454C");
		}
	});
	$("#minButton").click(function(){
		if(map.hasLayer(minLayer)){
			map.removeLayer(minLayer);
			$("#minButton").css("color", "#7E9699");
		} else {
			map.addLayer(minLayer);
			$("#minButton").css("color","#590202");
		}
	});

}


$(document).ready(function() {
	
	/*$('.ui-slider-handle').append('<div id="sliderPopup">bleh</div>');
	$('#sliderPopup').css('display','none');
	$('.ui-slider-handle').hover(function() {
		//$('.ui-slider-handle').attr('id','sliderPopup');
		$('#sliderPopup').css('display','block');
		$('#sliderPopup').toggle();	
		
	});*/
	
});

