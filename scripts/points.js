export {storeData, loadLayer, refreshLegend, loadClickEvents}


import {
    handleSidebarCollapse,
    sideBarCollapsed
} from "./components/sidebar.js";
const NUM_CIRCLES = 5;
const DEFAULT_FILL = 'white'
const DEFAULT_STROKE = '#000'
const HIGHLIGHT_COLOR = 'coral'
const INNER_STROKE_WIDTH = 1.2
const OUTER_STROKE_WIDTH = 1.4
const MAX_FILTERS = 8;
const COLORS = ['#40E0D0', '#CD5C5C', '#DAF7A6', '#FFC300', '#A2D9CE', '#FF5733', 'yellow', 'pink']
let circleDrawn = '#circle' +String(0)
let appliedColors = [];
let appliedFilters = 0;
let currFilters = [];
let pointGeoJSON;
let pointCities = {}
let pointFilters = {}
let pointLayer;

let map;
let svg;
let filterApplied = false;
let pointRadius;
var currYear = 2016;
let queryYears = false;
let cityStateFilter;
let legend = L.control({ position: 'bottomleft' });
let pointSingular = []; //data wrapper for individual cities
let filters = {"site of documented incident": [], "source": [],  "media":[], "targeted community":[]}
let filterColors = {"site of documented incident": [], "source": [],  "media":[], 'targeted community':[]}
let showImagesOnly = true;
let pointPane;

let filterLegend = L.control({ position: 'bottomright' });
function storeData(json) {
    pointGeoJSON = json
}
async function loadLayer(global_map) {
    await createPointFeatureDictionary();
    pointRadius = defineRadius();
    map = global_map
    L.svg({clickable:true}).addTo(map)
    pointLayer = d3Layer(pointSingular);
    let init_brush = x.domain().map(interval.round)
    d3.select(".brush").call(brush.move, init_brush.map(x)); 
    showSliderTooltip(init_brush.map(x))
    legend.addTo(map);
    loadFilterMenu();
    
}
function refreshLegend() {
    updateLegend();
}
function createPointFeatureDictionary() { //subset of the point geojson, used to concactenate points dict[point] = [...incident]
    pointGeoJSON.features.forEach(feature => {
        addFeatureToQuery(feature)
    })
}
function loadClickEvents() {
    let pointFilterBtn = $('#point-filter-btn')
    let mapQueryDiv = $('#query-container')
    let helpBtn = $("#help-btn")
    let filterMenu = $('#filter-menu')
    let mainMenu = $('#map-menu')
    let menu = $('#menu')
    /*     collapseBtn.click(() => {
            mapQueryDiv.html('')
            handleSidebarCollapse();
        }); */

    pointFilterBtn.click(() => {

        filterMenu.toggleClass('menu-collapsed')
        mainMenu.toggleClass('menu-collapsed')
        menu.toggleClass('extended')


    })
    helpBtn.click(() => {
        if (sideBarCollapsed) {
            handleSidebarCollapse();
        }
        mapQueryDiv.html("")
        loadHelpMenu();
    })

}

function loadFilterMenu() {
    let filterMenu = $('#filter-menu')
    let mainMenu = $('#map-menu')
    let availFilters = Object.keys(filters)
    let mapQueryDiv = $('#filter-menu-contents')
    let checked = []
    const filterBtn = (filter, property) => {
        let id = ('button-' + filter + property).replaceAll(' ', '-')
        let btn = $('<button>', {
            html: property,
            id: id
        })
        btn.on('click', () => {
            let checkBoxId = ('checkbox-' + filter + property).replaceAll(' ', '-')
            let index = filters[filter].indexOf(property)
            filters[filter].splice(index, 1)
            removeColor(filterColors[filter][index])
            filterColors[filter].splice(index, 1)
            appliedFilters -= 1
            $(`#${checkBoxId}`).prop('checked', false)
            let btnId = ('button-' + filter + property).replaceAll(' ', '-')
            $(`#${btnId}`).remove()
            refreshLegend();
            $('#label-'+checkBoxId).css({
                'color':"rgb(150, 150, 150)",
            })
            
            filterPoints();
            checkAppliedFilterCount()
        })
        btn.on('mouseover', () => {
            highlightPoints(filter, property)
        })
        btn.on('mouseout', () => {
        })
        return btn
    }
    let container = $('<div/>', {
        'class': "point-query-container",
    })
    let pointFilterWindow = $('<div/>', {
        'class': "point-filter-window",
    })
    let backBtn = $('<button>', {
        html: 'Go Back'
    })
    let header = $('<div/>', {
        'class': 'flex-row point-query-header',
        html: ''
    });

    backBtn.appendTo(header)
    $('<h3>', {
        html:'Filter Incidents'
    }).appendTo(header)


    let resetFilterBtn = $('<button>', {
        'class': ' reset-filter-btn',
        'id': 'filter-reset',
        'html': 'Reset Filters',
        'css': {'visibility': 'hidden'}
    })
    resetFilterBtn.on('click', () => {
        let keys = Object.keys(filters)
        keys.forEach((filterGroup) => {
            if(filters[filterGroup].length > 0) {
                filters[filterGroup].forEach( (filter) => {
                    let checkBoxId = ('checkbox-' + filterGroup + filter).replaceAll(' ', '-')
                    $(`#${checkBoxId}`).prop('checked', false)
                    let btnId = ('button-' + filterGroup + filter).replaceAll(' ', '-')
                    $(`#${btnId}`).remove()
                    $('#label-'+checkBoxId).css({
                        'color':"rgb(150, 150, 150)",
                        'text-shadow': 'none'
                    })
                })
                filters[filterGroup] = []
                filterColors[filterGroup] = []
            }
        })
        appliedFilters = 0
        appliedColors = []
        refreshLegend();
            
        filterPoints();
        checkAppliedFilterCount();
        

    })
    let filterList = $('<div>', {
        'class': 'point-query-filters',
        html: '<h4> Applied Filters: </h4>',
    })
    resetFilterBtn.appendTo(header)
    header.appendTo(container)
    filterList.appendTo(container)
    pointFilterWindow.appendTo(container)
    container.appendTo(mapQueryDiv)
    backBtn.on('click', () => {
        filterMenu.toggleClass('menu-collapsed')
        mainMenu.toggleClass('menu-collapsed') 
        $('#menu').toggleClass('extended')     
    })
    container.on('mouseenter', ()=> {
        
        svg.selectAll('g.Dots')
        .selectAll('circle')
        .attr('visibility', 'hidden')
        
        svg.selectAll('g.Dots')
        .selectAll(circleDrawn)
        .attr('visibility', 'visible')
        .attr('fill', DEFAULT_FILL)
        .attr('opacity', 0.2)
    })
    container.on('mouseleave', ()=> {
        svg.selectAll('g.Dots')
        .selectAll('circle')
        .attr('visibility', 'hidden')
        .attr('opacity', 1.0)
        filterPoints();
    })
    
    availFilters.forEach( filter => {
        let group = d3.group(pointGeoJSON.features, d => d.properties[filter])
        
        let groupKeys = Array.from(group.keys())
        groupKeys.sort(function(a, b) {
            return group.get(b).length - group.get(a).length
        })
        let itemContainer = $('<div>', {
            'class': 'point-filter-item-container',
        })
        let btn = $('<h3>', {
            html: filter
        })
        let itemDiv = $('<div/>', {
            'class': 'point-filter-items',
        });
        btn.appendTo(itemContainer)
        itemDiv.appendTo(itemContainer)
        btn.on('click', () => {
            itemDiv.toggleClass('open')
        })
        groupKeys.forEach(property => {
            if(property !== '') {
            let propertyText = property === '' ? 'None' : property;
            let checkBoxId = ('checkbox-' + filter + property).replaceAll(' ', '-')
            let checkBox = $('<input/>', {
                type: 'checkbox',
                name: filter,
                id: checkBoxId,
                value: property,
                html: `<label for="${property}"> )</label>`,


            })

            checkBox.change(() => {
                if(checkBox.prop('checked')) {

                    filters[filter].push(property)
                    let color = getNextColor()
                    filterColors[filter].push(color)

                    let newBtn = filterBtn(filter, property)
                    newBtn.appendTo(filterList)
                    
                    appliedFilters += 1

                    $('#filter-reset').css({
                        'visibility': 'visible'
                    })
                    $('#label-'+checkBoxId).css({
                        'color':color
                    })
                    //default color: rgb(150, 150, 150)
                    

                    

                } else {
                    let index = filters[filter].indexOf(property)

                    filters[filter].splice(index, 1)
                    removeColor(filterColors[filter][index])
                    filterColors[filter].splice(index, 1)
                    appliedFilters -= 1
                    let btnId = ('button-' + filter + property).replaceAll(' ', '-')
                    $(`#${btnId}`).remove()
                    checkAppliedFilterCount()
                    $('#label-'+checkBoxId).css({
                        'color':"rgb(150, 150, 150)",
                        'text-shadow': 'none'
                    })
                    //default color: rgb(150, 150, 150)
                    
                }
                
                filterPoints();
                refreshLegend();
            })
            
            checkBox.prop('checked', () => {
                    if (filters[filter].includes(property)) {
                        let newBtn = filterBtn(filter, property)
                        newBtn.appendTo(filterList)                   
                        return true
                    }
                    return false
            })
            
            let checkBoxLabel = $('<label/>', {
                for: checkBoxId,
                html: `${propertyText} <b> (${group.get(property).length}) </b>`,
                id: "label-" + checkBoxId


            })
            checkBoxLabel.on('mouseenter', () => {
                highlightPoints(filter, property)
            })
            checkBoxLabel.on('mouseleave', () => {
            })
            checkBox.appendTo(itemDiv)
            checkBoxLabel.appendTo(itemDiv)
        }
        })
        itemContainer.appendTo(pointFilterWindow)
    })
    
}
function checkAppliedFilterCount() {
    if (appliedFilters == 0) {
        $('#filter-reset').css( {
            'visibility':'hidden'
        })
    }
}
function getNextColor() {
    for(let i=0; i<COLORS.length; i++) {
        if(!appliedColors.includes(COLORS[i])) {
            appliedColors.push(COLORS[i])
            return COLORS[i]
        }
    }
    return('#FFF')
}
function removeColor(color) {
    let index = appliedColors.indexOf(color)
    appliedColors.splice(index, 1)
}
var tooltip = d3.select("body")
    .append("div")
    .style("position", "absolute")
    .style("z-index", "10000000")
    .style("visibility", "hidden")
    .style("background", "#000")
    .attr('class', 'popup')
    .text("a simple tooltip");
function showTooltip(d) {
    let cityState = d.properties.city_state
    let html = `<h2> ${cityState}</h2> <p> Number of incidents: <b> ${cityStateFilter.get(cityState).length} </b> <br> <br> <b> Click </b>for more info</p>`
    tooltip.html(html)
    .style('visibility', 'visible')
}
function hideTooltip() {
    tooltip.html('')
    .style('visibility', 'hidden')
}
function showPointData(d) {
    let mapQueryDiv = $('#query-container')
    
    let cityState = d.properties.city_state
    let data = cityStateFilter.get(cityState)
    let html = `<div class='point-query-container'> <div class='point-query-header' id='point-query-header-id'> <h3> ${cityState} </h3> <h4> Reported Incidents: ${data.length} </div> `
    html += ' <div class="relative-fill"> <div class="point-queries">'
    html += populateQuery(data)
    html += "</div> </div> </div>"
    mapQueryDiv.html(html)
    if (sideBarCollapsed) {
            handleSidebarCollapse();

            
            }
    if (filterApplied && data.length < pointCities[cityState].length) {
        let filterNotifier = $('<div>', {
            html:'This is displaying the filtered incidents <br>'
        })
        let showAllDataBtn = $('<button>', {
            html:'Show All Data for ' + cityState
        })
        showAllDataBtn.on('click', () => {
            showAllPointData(cityState)
        })
        showAllDataBtn.appendTo(filterNotifier)
        filterNotifier.appendTo('#point-query-header-id')
    }
}
function showAllPointData(cityState) {
    let mapQueryDiv = $('#query-container')
    
    let data = pointCities[cityState]
    let html = `<div class='point-query-container'> <div class='point-query-header' id='point-query-header-id'> <h3> ${cityState} </h3> <h4> Reported Incidents: ${data.length} </div> `
    html += ' <div class="relative-fill"> <div class="point-queries">'
    html += populateQuery(data)
    html += "</div> </div> </div>"
    mapQueryDiv.html(html)
    if (sideBarCollapsed) {
            handleSidebarCollapse();

            
            }
}
function highlightPoints(filter, property) {
    let filteredData = pointGeoJSON.features.filter( (d) => {
        return d.properties[filter] == property
    }).filter( (d) => {
        if(timeFilter.length == 0) {
            return true
        } else {

        if (timeFilter.includes(d.properties.date)) {
            return true
        }
    }
    return false
    })
    let filterCityGroup = d3.group(filteredData, d => d.properties.city_state)
    let filterCityGroupKeys = Array.from(filterCityGroup.keys())
    let group = svg.selectAll('g.Dots')
    group.selectAll('circle')
    .attr('visibility', 'hidden')
    .attr('stroke', DEFAULT_STROKE)
    .attr('stroke-width', 1.4)
    group
    
    .selectAll(circleDrawn)
    .attr('visibility', 'visible')
    .attr('fill', DEFAULT_FILL)
    .attr('opacity', 0.2)
    
    .attr("r", function(d) {
        return d.radius
    })

    group.filter( (d) => {
        if(timeFilter.length == 0) {
            return true
        } else {

        if (timeFilter.includes(d.properties.date)) {
            return true
        }
    }
    return false
    })
    .filter( (d) => {
        return filterCityGroupKeys.includes(d.properties.city_state)
    })
    .selectAll(circleDrawn)
    .attr('class', 'visible')
    .attr('fill', HIGHLIGHT_COLOR)
    .attr('opacity', 1.0)
    .attr("r", function(d) {
        return pointRadius(filterCityGroup.get(d.properties.city_state).length)
    })


}
function filterPoints() {
    let filterKeys = Object.keys(filters)
    filterApplied = false
    const applyFilter = () => {
        let bool = false
        filterKeys.forEach( filter => {
            if(filters[filter].length > 0) {
                bool = true
            }
        })
        return bool
    }

    let fil = svg.selectAll('g.Dots')
    .attr('visibility', 'hidden')

    fil.selectAll('circle')
    .attr('class', 'hidden')
    .attr('visibility', 'hidden')
    let filteredData = pointGeoJSON.features.filter( (d) => {
        if(timeFilter.length == 0) {
            return true
            
        } else {

        if (timeFilter.includes(d.properties.date)) {
            filterApplied = true
            return true
        }
    }
    return false
    })

    if (applyFilter()) {
        filterApplied = true
        filteredData = filteredData.filter( (d) => {
            let bool = false
            filterKeys.forEach( filter => {
                if (filters[filter].includes(d.properties[filter])) {
                    bool = true
                }
            })
            return bool
        })
    }

    cityStateFilter = d3.group(filteredData, d => d.properties.city_state)
    let cityKeys = Array.from(cityStateFilter.keys())
    let filter = fil.filter( (d) => {
        if(cityKeys.includes(d.properties.city_state)) {
            let data = cityStateFilter.get(d.properties.city_state)
            d.radius = pointRadius(cityStateFilter.get(d.properties.city_state).length)
            return true

        }
        return false
    })
    filter
    
    .selectAll('circle')
    .attr('class', 'visible')
    .attr("r", function(d) {
        d.radius = pointRadius(cityStateFilter.get(d.properties.city_state).length)
        return d.radius + d.r_add
    })
    

    defineCircleStyle();
    

    

    

    
    

}
function d3Layer(data) {
    let circleProperties = [ {'index': 0}, {'index': 1}, {'index': 2}]
    const overlay = d3.select(map.getPanes().overlayPane)
    let circDrawn = 0
    svg = overlay.select('svg').attr("pointer-events", "auto")
    const featureByPlace = d3.group(pointGeoJSON.features, d => d.properties['category of place'])
    const Dots = svg.append('g')
    .selectAll('g.Dots')
                    
                    .data(data)
                    .enter()
                    .append('g')
                    .attr('class', 'Dots' )
                    .attr('id', function(d,i) {
                        d.id = i
                        return 'group'+d.id
                    })
                    .on('mouseover', function(e, d ) { //function to add mouseover event
                        showTooltip(d)
                        d3.select(this).selectAll(circleDrawn).transition() //D3 selects the object we have moused over in order to perform operations on it
                          .duration(200) //how long we are transitioning between the two states (works like keyframes)
                          .attr("fill", HIGHLIGHT_COLOR)
                          .attr('r', function(d) {
                            return d.radius * 1.5
                          }) //change the fill //change radius
                        
                      })
                      .on('mouseout', function() {
                          hideTooltip();

                          d3.select(this).selectAll(circleDrawn).transition() //D3 selects the object we have moused over in order to perform operations on it
                          .duration(200) //how long we are transitioning between the two states (works like keyframes)
                          .attr("fill", function(d) {
                            return d.fill
                          }) //change the fill //change radius
                          .attr('r', function(d) {
                            return d.radius
                          })

                      })
                      .on("mousemove", function() {
                        return tooltip.style("top", (event.pageY + 15) + "px")
                          .style("left", (event.pageX + 15) + "px");
                      })
                      .on('click', (e, d)=> {
                          showPointData(d)
                      })
                      .selectAll('g.Dots')
                    .data(function(d) {
                        let circs = []
                        let radius = pointRadius(pointCities[d.properties.city_state].length)
                        for(let i =0; i<NUM_CIRCLES; i++) {
                            let colorIndex = (i*2)-1
                            let visible = false
                            if (colorIndex-1 == appliedFilters) {
                                visible = true
                            }
                            circDrawn += 1
                            circs.push( {
                                fill:COLORS[colorIndex-1],
                                stroke:COLORS[colorIndex],
                                index: i,
                                visible:false,
                                r_add: i*3.0,
                                radius: radius,
                                coordinate:[d.geometry.coordinates[1],d.geometry.coordinates[0]],
                                properties:d.properties,
                                stroke_width:2.5
                            })
                        }
                        return circs
                    })
                    .enter()
                    .append('circle')
                        .attr("id", function(d,i) {
                            return 'circle' + i
                        })
                        .attr('visibility', 'hidden')
                        .attr('stroke-width', 2.0)
                        .attr('stroke-opacity', 1.0)
                        .attr('z-index', 100000)
/*                         .filter((d) => {
                            if(d.properties['year'] == 2016) {
                                return true
                            }
                        }) */
                        
                        //Leaflet has to take control of projecting points. Here we are feeding the latitude and longitude coordinates to
                        //leaflet so that it can project them on the coordinates of the view. Notice, we have to reverse lat and lon.
                        //Finally, the returned conversion produces an x and y point. We have to select the the desired one using .x or .y
                        .attr("cx", d => map.latLngToLayerPoint(d.coordinate).x)
                        .attr("cy", d => map.latLngToLayerPoint(d.coordinate).y) 
                        .attr("r",function(d) {
                            return d.radius
                        })
                        .sort( (a, b) => {
                            return b.r_add - a.r_add
                        })
                        

    const update = () => Dots
            .attr("cx", d => map.latLngToLayerPoint(d.coordinate).x)
            .attr("cy", d => map.latLngToLayerPoint(d.coordinate).y) 
    cityStateFilter = pointGeoJSON.features;
    cityStateFilter = d3.group(cityStateFilter, d => d.properties.city_state)
    console.log(cityStateFilter)
    
    sortCirlces();
    defineCircleStyle();
    
    map.on("zoomend", update)
}
function getCircleColors(d) {
     let groupFilter = cityStateFilter.get(d.properties.city_state)
    let colorsApplied = []
    let filterKeys = Object.keys(filters)
    groupFilter.forEach( city => {
        
        filterKeys.forEach(key => {
            
            filters[key].forEach(filter => {
                let index = filters[key].indexOf(filter)
                let color = filterColors[key][index]
                if(!colorsApplied.includes(color)) {
                    if(city.properties[key] == filter) {
                        colorsApplied.push(color)
                    }
                    
                }

            })
            })
        })
    
    colorsApplied.sort()
    colorsApplied.unshift(DEFAULT_STROKE)
    colorsApplied.unshift(DEFAULT_FILL)
        
    
    return colorsApplied
}
function defineCircleStyle() {
    d3.selectAll('g.Dots')
    .each( (d, i, j)=> {
        let visibilityCheck = cityStateFilter.has(d.properties.city_state) 
        let circColors = visibilityCheck ? getCircleColors(d) : [DEFAULT_FILL]
        let addedCircle = circColors.length == 2 ? 0 : 1
        let circlesDrawn = visibilityCheck ? Math.ceil((circColors.length+addedCircle)/2.0) : 0

        d3.select('#group' + d.id)
        .selectAll('circle')
        .each( (d, i)=> {
            d.visible = 'hidden'
            d.stroke = 'none'
            d.fill ='none'
            if(NUM_CIRCLES - i <= circlesDrawn) {

                d.fill = circColors[d.index]
                if(typeof(circColors[d.index+1]) != 'undefined') {
                    d.stroke = circColors[d.index+1]
                }
                
                d.visible = 'visible'
                d.stroke_width = 3.0
                if (d.stroke == DEFAULT_STROKE) {
                    d.stroke_width = 1.5

                }


            }
        })
    })
    styleCircles(d3.selectAll('g.Dots'));

}
function styleCircles(group) { //pass a group

    group.selectAll('circle')
    .attr('visibility', (d) => { 
        return d.visible
    })
    .attr("fill", function(d) {
        return d.fill
    }) //#F6F6F4 #252323
    .attr("stroke", function(d) {
        return d.stroke
        }
    )
    .attr('stroke-width', function(d) {
        return d.stroke_width
    })
    .attr('opacity', 1.0)

}


function sortCirlces() {
    svg.selectAll("g.Dots")
    .sort( (a, b) => {
        return pointCities[b.properties.city_state].length - pointCities[a.properties.city_state].length
    })
}
function addFeatureToQuery(feature) {
    let cityState = feature.properties.city_state

    if (typeof (pointCities[cityState]) === 'undefined') {
        pointCities[cityState] = [];
        pointSingular.push(feature)
    }
    pointCities[cityState].push(feature)

}

function processPointProperties(properties) {
    let keys = Object.keys(properties)
    for (let property in Object.keys(properties)) {
        let propertyName = keys[property]
        if (typeof (pointFilters[propertyName]) === "undefined") {
            pointFilters[propertyName] = []

        }
        if (!pointFilters[propertyName].includes(properties[propertyName])) {
            pointFilters[propertyName].push(properties[propertyName])
        }
    }


}
function populateQuery(features) {
    let div = ""
    features.forEach((feature) => {
        div += loadCard(feature.properties)

    })
    return div;

}

function loadCard(properties) {
    const checkTarget = ()=>{
        if(properties['target'] != 'none') {
            return(`<li> <b>Targeted Community:</b> ${properties['targeted community']} </li>`)
        }
        return ''
    }
    const checkImg =  () => {
        if (properties['Image?'] == true) {
            return `<li> <b> Image</b>: <a href= "${properties['img_link']}" target="_blank"> ${properties['img_link'].substring(0, 25)}... </a> </li>`
        }
        return ''
    }
    return `<div class="query-card">
    <ul>
        <li> <b>Date of discovery or report:</b> ${properties['date of discovery or report']} </li>
        <li> <b>Source:</b> <a href="${properties['website']}" target="_blank" rel="noopener noreferrer"> ${properties['website'].substring(0, 25)}... </a> </li>
        <li> <b>Site of Documented Incident:</b> ${properties['site of documented incident']} </li>
        <li> <b>Place:</b> ${properties['place']} </li>
        <li> <b>Structure:</b> ${properties['structure']} </li>
        <li> <b>Media:</b> ${properties['media']}</li>
        ${checkTarget()}
        ${checkImg()}
        
    </ul>
    
</div>`
}

function stylePoints(feature) {
    // let pointColor = getPointColor(feature.properties[selectedFilter])
    var geojsonMarkerOptions = {
        radius: 5,
        fillColor: '#FFF',
        color: "#000",
        weight: 2,
        opacity: 1,
        fillOpacity: 1.0,
        pane: 'locationMarker',
    };
    return geojsonMarkerOptions;
}

// time query
let timeFilter = []
 //for getting points in filter by city and state
const timeQuery = d3.select("#time-query"),
    margin = {top: 10, right: 20, bottom: 30, left: 20},
    width = +timeQuery.attr("width") - margin.left - margin.right,
    height = +timeQuery.attr("height") - margin.top - margin.bottom;

/* $('#time-query').on('mouseover', (e) => {
    let extent = d3.brushSelection(d3.select(".brush").node())
    if (extent) {
        showSliderTooltip(extent)
    }
    
}) */

function applyTimeFilter() {
    sortCirlces();
    filterPoints();
/*     svg.selectAll('circle')
    .attr('r', function(d) {
        return pointRadius(filterGroup.get(d.properties.city_state).length)
    }) */
    


}
function defineRadius() {
    var length = pointGeoJSON.features.length;
	var numbers = [];
	for (var mug=0; mug<length; mug++) {
		var num = pointCities[pointGeoJSON.features[mug].properties.city_state].length
		numbers.push(Number(num));
	}
    var min = Math.min.apply(Math, numbers);
	var max = Math.max.apply(Math, numbers);
	
	var r = d3.scaleSqrt()
		.domain([min, max])
		.range([5, 25]);
    return r
}
function showSliderTooltip(extent) {
    let timeExtent = extent.map(x.invert)
    let from = formatMonth(timeExtent[0])
    let to = formatMonth(timeExtent[1])
    let range = d3.timeMonths(timeExtent[0], timeExtent[1])
    let filteredTime = []
    range.forEach(time => {
        time = String(formatMonth(time))
        time = time.split('-')
        time[1] = time[1].substring(2)
        time = time[0] + '-' + time[1]
        filteredTime.push(time)
    })
    timeFilter = filteredTime
    applyTimeFilter();
    let toolTipLeft = extent[0] > extent[1] - 100 ? extent[1] - 100 : extent[0]
    $('#tooltip-from').css({left: toolTipLeft}).html(from)
    $('#tooltip-to').css({left: extent[1]}).html(to)
}
const tParser = d3.timeParse("%m/%Y")
const x = d3.scaleTime().domain([new Date(2015, 12, 1), new Date(2021, 4, 1) - 1]).range([0, width]);

const xAxis = d3.axisBottom(x)        
.tickFormat(d3.timeFormat('%Y'))//%Y-for year boundaries, such as 2011
.ticks(5); //5 year data range

const brush = d3.brushX()
    .extent([[0, 0], [width , height]])
    .on("brush", brushed)


const context = timeQuery.append("g")
    .attr("class", "context")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

context.append("g")
    .attr("class", "axis axis--x")
    .attr("transform", "translate(0," + height + ")")
    .call(xAxis);

context.append("g")
    .attr("class", "brush")
    .call(brush)
const formatMonth = d3.timeFormat('%b-%Y');
const interval = d3.timeMonth.every(1)

function brushed(event) {
    
    if (!event.sourceEvent) return;
    if (!event.selection) return;
   
    const d0 = event.selection.map(x.invert);
    const d1 = d0.map(interval.round);

    // If empty when rounded, use floor instead.
    if (d1[0] >= d1[1]) {
      d1[0] = interval.floor(d0[0]);
      d1[1] = interval.offset(d1[0]);
    }
    d3.select(this).call(brush.move, d1.map(x));
    showSliderTooltip(d1.map(x))
  return timeQuery.node();
  
}

// LEGEND
const pointLegend = () => {
    
    let list = ''
    let header = ''
    let keys = Object.keys(filterColors)
    keys.forEach(key => {
        if(filterColors[key].length > 0) {
            header = 'Applied Filters'
            list += `<div class='point-legend-list'> <p>${key} </p>`
            for(let i =0; i<filterColors[key].length; i++) {
                list += `<div class='point-legend-obj'>  <span style="border-radius:50%; border:1px solid #000000A8; background-color:${filterColors[key][i]}"> </span>${filters[key][i]} </div>`
            }
            list += '</div>'
        }
    })
    let div = '<div class="legend-block">' + header + '<div class="point-legend-list-container">'  + list +' </div> </div>' 
    return div

}
            
  
      legend.onAdd =  function () {
        // create the control container with a particular class name
        var container = L.DomUtil.create("div", "legend-control-container");
        container.setAttribute('id', 'point-legend')
        container.innerHTML = getLegend();
        
        return container;
      }
    function updateLegend() {
        let container = $('#point-legend')
        container.html(getLegend());
        
    }
    function getLegend() {
        var container = '';
  
        
        //Step 1: start attribute legend svg string
        var svg =  '<svg id="attribute-legend">';
        var legend_over = '';
        var paths = '<g>';
        //array of circle names to base loop on
        var circles = [40,20,5,1];
  
        //Step 2: loop to add each circle and text to svg string
        for (var i = 0; i < circles.length; i++) {
          //calculate r and cy
          var radius = pointRadius(circles[i]);
          var cy = 59 - radius;
          var textY = i * 12 + 20;
          paths += '<path d="M '+(60) +' ' + (textY -5) + ' 30 ' + (textY-5) + ' V ' + textY+'"  stroke="black" stroke-width="0.2"  fill="none"/>';
          //circle string
          legend_over +=
            '<circle class="legend-circle" id="' +
            circles[i] +
            '" r="' +
            radius +
            '"cy="' +
            cy +
            '" fill="white" fill-opacity="1.0" stroke="black" stroke-opacity="0.5" stroke-width="2.0" cx="30"/>'
            ;
  
          //evenly space out labels
          var textY = i * 12 + 20;
  
          //text string
          legend_over +=
            '<text id="' +
            circles[i] +
            '-text" x="80" y="' +
            textY +
            '" text-anchor="middle">' +
            circles[i] +

            "</text>";
            
        }
  
        //close svg string
        
        svg += legend_over
        svg += paths + '</g>'
        svg += "</svg> ";
  
        //add attribute legend svg to container
        let svgContainer = '<div style="height:fit-content; margin:auto">' +'<p class="temporalLegend"> Reported Incidents </p>' + svg +'</div>'
        container =  '<div class="point-legend-container">' + pointLegend()  +  svgContainer +  '</div>';
        return container;
  
    }