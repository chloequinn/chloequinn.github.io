//global variables
var keyArray = ["Hydro","Geothermal","Solar","Wind","Biofuels/Waste","Fossil Fuels","Nuclear"];
var expressed = keyArray[0]; //initial attribute

//begin script when window loads
window.onload = initialize();


//the first function called once the html is loaded
function initialize(){
	setMap();
};

//set choropleth map parameters
function setMap(){
	
	//map frame dimensions
	var width = 1160;
	var height = 790;

	//create a new svg element with the above dimensions
	var map = d3.select("#map")
		.append("svg")
		.attr("width", width)
		.attr("height", height);

	//create World albers equal area conic projection, centered on France
	var projection = d3.geo.albers()
		.center([10, 50])
		.rotate([70, 0])
		//.parallels([,])
		.scale(190)
		.translate([width / 2, height / 2]);
	

	//create svg path generator using the projection
	var path = d3.geo.path()
		.projection(projection);
		
	//create graticule generator
	var graticule = d3.geo.graticule()
		.step([20, 20]); //place graticule lines every 20 degrees

	//create graticule background
	var gratBackground = map.append("path")
		.datum(graticule.outline) //bind graticule background
		.attr("class", "background") //assign class for styling
		.attr("d", path) //project graticule

	//create graticule lines
	var gratLines = map.selectAll(".graticule") //select graticule elements
		.data(graticule.lines) //bind graticule lines to each element
		.enter() //create an element for each datum
		.append("path") //append each element to the svg as a path element
		.attr("class", "graticule") //assign class for styling
		.attr("d", path); //project graticule lines
		
	//retrieve data in csv data file for coloring choropleth
	d3.csv("data/data.csv", function(csvData){ //callback #1
		var recolorMap = colorScale(csvData);
		drawPcp(csvData);
	
	
	
		//retrieve and process world json file
		d3.json("data/world.json", function(error,world) { //callback #2
		
			//variables for csv to json data transfer
			var jsonWorld = world.objects.world.geometries;

			//loop through csv to assign each csv values to json countries
			for (var i=0; i<csvData.length; i++) {
				var csvWorld = csvData[i]; //the current country
				var csvGua3 = csvWorld.gu_a3; //gu_a3 code

				//loop through json countries to find right country
				for (var a=0; a<jsonWorld.length; a++){

					//where sov_a3 codes match, attach csv to json 19
					if (jsonWorld[a].properties.gu_a3 == csvGua3){

						// assign all 7 key/value pairs
						for (var b=0; b<keyArray.length; b++){
							var key = keyArray[b];
							var val = parseFloat(csvWorld[key]);
							jsonWorld[a].properties[key] = val;
						};

					jsonWorld[a].properties.name = csvWorld.name; //set prop
					break; //stop looking through the json countries
					};
				};
			};
			
			//add world countries geometry to map
			var countries = map.append("path") //create SVG path element
				.datum(topojson.object(world, world.objects.world))
				.attr("class", "countries") //class name for styling
				.attr("d", path); //project data as geometry in svg
				
			//add countries to map as enumeration units colored by data
			var countriesColor = map.selectAll(".world")
				.data(topojson.object(world, world.objects.world).geometries)
				.enter() //create elements
				.append("path") //append elements to svg
				.attr("class", "world") //assign class for additional styling
				.attr("id", function(d) { return d.properties.gu_a3 })
				.attr("d", path) //project data as geometry in svg
				.style("fill", function(d) { //color enumeration units
					return choropleth(d, recolorMap); //->
				})
				
				.on("mouseover", highlight)
				.on("mouseout", dehighlight)
				.on("mousemove", moveLabel)
				.append("desc") //append the current color
					.text(function(d) {
						return choropleth(d, recolorMap);
					});
		});
	});
	
};


function colorScale(csvData){

	//create quantile classes with color scale
	var color = d3.scale.quantile() //designate quantile scale generator
		.range([
			"#C7E9C0",
			"#A1D99B",
			"#74C476",
			"#31A354",
			"#006D2C"
		]);

	//set min and max data values as domain
	color.domain([
		d3.min(csvData, function(d) { return Number(d[expressed]); }),
		d3.max(csvData, function(d) { return Number(d[expressed]); })
	]);

	return color; //return the color scale generator
};

function choropleth(d, recolorMap){

	//get data value
	var value = d.properties[expressed];
	
	//if value exists, assign it a color; otherwise assign gray
	if (value >= 0) {
		if (value == 0){
			return "#EDF8E9";
		}
		else {
			return recolorMap(value);
		}
	} else {
		return "#373737";
	};
};

function drawPcp(csvData){
	//pcp dimensions
	var width = 1200;
	var height = 440;
	
	//create attribute names array for pcp axes
	var keys = [], attributes = [];
	//fill keys array with all property names
	for (var key in csvData[0]){
		keys.push(key);
	};
	//fill attributes array with only the attribute names
	for (var i=3; i<keys.length; i++){
		attributes.push(keys[i]);
	};
	
/*attributes.forEach(function(each){
		d3.select('#pcpAxisTitles')
			.append('span')
			.attr('class', 'actualTitle')
			.attr('id',each)
			.html(each)
			.on("click", function(){ //click listener
				//d3.selectAll('#pcpAxisTitles span').classed('titleSelected', false);
				//d3.select(this).attr('class','titleSelected');
				//sequence(this, csvData);
		});
	});*/
	
	//create horizontal pcp coordinate generator
	var coordinates = d3.scale.ordinal() //create an ordinal scale for plotting axes
		.domain(attributes) //horizontally space each attribute's axis evenly
		.rangePoints([0, width]); //set the horizontal scale width as the SVG width

	var axis = d3.svg.axis() //create axis generator
		.orient("left"); //orient generated axes vertically

	//create vertical pcp scale
	scales = {}; //object to hold scale generators
	attributes.forEach(function(att){ //for each attribute
    	scales[att] = d3.scale.linear() //create a linear scale generator for the attribute
        	.domain(d3.extent(csvData, function(data){ //compute the min and max values of the scale
				return +data[att]; //create array of data values to compute extent from
			})) 
        	.range([height, 0]); //set the height of each axis as the SVG height
	});

	var line = d3.svg.line(); //create line generator

	//create a new svg element with the above dimensions
	var pcplot = d3.select("#pcpContainer")
		.append("svg")
		.attr("width", width)
		.attr("height", height+50)
		.attr("class", "pcplot") //for styling
		.append("g") //append container element
		.attr("transform", d3.transform( //change the container size/shape
			"scale(0.8, 0.6),"+ //shrink
			"translate(96, 150)")); //move

	var pcpBackground = pcplot.append("rect") //background for the pcp
		.attr("x", "-30")
		.attr("y", "-35")
		.attr("width", "1180")
		.attr("height", "380")
		.attr("rx", "15")
		.attr("ry", "15")
		.attr("class", "pcpBackground");
		
	//add lines
	var pcpLines = pcplot.append("g") //append a container element
		.attr("class", "pcpLines") //class for styling lines
		.selectAll("path") //prepare for new path elements
		.data(csvData) //bind data
		.enter() //create new path for each line
		.append("path") //append each line path to the container element
		.attr("id", function(d){
			return d.gu_a3; //id each line by admin code
		})
		.attr("d", function(d){
			return line(attributes.map(function(att){ //map coordinates for each line to arrays object for line generator
				return [coordinates(att), scales[att](d[att])]; //x and y coordinates for line at each axis
			}));
		})
		
		.on("mouseover", highlight)
		.on("mouseout", dehighlight)
		.on("mousemove", moveLabel);


	//add axes	
	var axes = pcplot.selectAll(".attribute") //prepare for new elements
		.data(attributes) //bind data (attribute array)
		.enter() //create new elements
		.append("g") //append elements as containers
		.attr("class", "axes") //class for styling
		.attr("transform", function(d){
			return "translate("+coordinates(d)+")"; //position each axis container
		})
		/*.on("mouseover", function(d){
			d3.select(this).classed("attrHover",true);
				console.log('on',this);
		}).on("mouseout", function(d){
			d3.select(this).classed("attrHover",false);
				console.log('off', d, this);
		})*/
		
		.each(function(d){ //invoke the function for each axis container element
			d3.select(this) //select the current axis container element
				.call(axis //call the axis generator to create each axis path
					.scale(scales[d]) //generate the vertical scale for the axis
					.ticks(4) //no ticks
					.tickSize(8) //no ticks, I mean it!
					
					
				)
				.attr("id", d) //assign the attribute name as the axis id for restyling
				.style("stroke-width", "5px") //style each axis	
		
				.on("click", function(){ //click listener
					sequence(this, csvData);
				});	
		});

	pcplot.select("#"+expressed) //select the expressed attribute's axis for special styling
		.style("stroke-width", "10px");
};
	
function highlight(data){
	var props = datatest(data); //standardize json or csv data
	
	if(props[expressed] >= 0 ) {

	d3.select("#"+props.gu_a3) //select the current country in the DOM
		.style("fill", "#151515"); //set the enumeration unit fill to black
	
	//highlight corresponding pcp line
	d3.selectAll(".pcpLines") //select the pcp lines
		.select("#"+props.gu_a3) //select the right pcp line
		.style("stroke","white"); //restyle the line

	var labelAttribute = "<h1>"+props[expressed]+ "</h1><br><b>"+expressed+"</b>"; //label content
	var labelName = props.name; //html string for name to go in child div
	
	if(props.brk_name){
		var targetElement = '#map';
	} else if (props.name) {
		var targetElement = '#pcpContainer';
	}
	
	//create info label div
	var infolabel = d3.select(targetElement).append("div")
		.attr("class", "infolabel") //for styling label
		.attr("id", props.gu_a3+"label") //for label div
		.html(labelAttribute) //add text
		.append("div") //add child div for feature name
		.attr("class", "labelname") //for styling name
		.html(labelName); //add feature name to label
	}
};


function datatest(data){
	if (data.properties){ //if json data
		return data.properties;
	} else { //if csv data
		return data;
	};
};

function dehighlight(data){
	var props = datatest(data);	//standardize json or csv data

	var prov = d3.select("#"+props.gu_a3); //designate selector variable for brevity
	var fillcolor = prov.select("desc").text(); //access original color from desc
		prov.style("fill", fillcolor); //reset enumeration unit to orginal color

	//dehighlight corresponding pcp line
	d3.selectAll(".pcpLines") //select the pcp lines
		.select("#"+props.gu_a3) //select the right pcp line
		.style("stroke","#373737"); //restyle the line

	d3.select("#"+props.gu_a3+"label").remove(); //remove info label
};


function moveLabel() {

	var x = d3.mouse(this)[0]+20; //horizontal label coordinate
	var y = d3.mouse(this)[1]-70; //vertical label coordinate

	d3.select(".infolabel") //select the label div for moving
		.style("left", x+"px") //reposition label horizontal
		.style("top", y+"px"); //reposition label vertical
};

function sequence(axis, csvData){
		//<-drawPcp axes.each.on("click"...

		//restyle the axis
		d3.selectAll(".axes") //select every axis
			.style("stroke-width", "6px"); //make them all thin
			axis.style.strokeWidth = "12px"; //thicken the axis that was clicked as user feedback
			

		expressed = axis.id; //change the class-level attribute variable

		//recolor the map
		d3.selectAll(".world") //select every country
			.style("fill", function(d) { //color enumeration units
				return choropleth(d, colorScale(csvData)); //->
			})
			.select("desc") //replace the color text in each country's desc element
			.text(function(d) {
				return choropleth(d, colorScale(csvData)); //->
			});
		
};

$( "#about" ).accordion({
				active: false,
				collapsible:true,
				heightStyle:"content"
});
	
		
 