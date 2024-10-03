import { sideBarCollapsed, handleSidebarCollapse } from "./components/sidebar.js";
import InfoBox from "./components/InfoBox.js";
export {loadLayer, clearLayer, storeData, resetMapLayer, loadBreaks, setParent, data , legend, queryable}
let infoBox = $('.infoBox')
let map;
let map_layer;
let data;
let parent;
infoBox.css({ visibility: "visible"})
let queryable = ['PCT_JEW_TO']
let breaksData;
let quantiles = {}
let jewPopLegend = {
    title: "Jewish Population by State",
    property: "POP_JEW_TO",
    quantiles: [0, 69200, 154600, 348000, 1173600]
}
let stateIncidentLegend = {
    title: "Reported Incidents by State",
    property:"NUMPOINTS",
    quantiles: [0, 12, 31, 79, 135]
}
let selectedLegend = 'PCT_JEW_TO';
let colors_5 = ['#f1eef6','#bdc9e1','#74a9cf','#2b8cbe','#045a8d']


function setParent(obj) {
    parent = obj;
}
async function loadBreaks() {
    await fetch("data/breaks/state_jenks_breaks.json")
.then(response => {
   return response.json();
})
.then(jsondata => {
    queryable = Object.keys(jsondata)
    breaksData = jsondata
    
});
console.log(breaksData)
return breaksData;


}
function storeData(json) {
    data = json;
    

}
 function loadLayer(global_map) {
    map = global_map;
    map_layer =  L.geoJson(data, {
            style: style,
            onEachFeature: onEachFeature
    }).addTo(map);
   
    infoBox.css({ visibility: "visible"})
    legend.addTo(map);
    clearInfoBox();
}
function clearLayer(map) {
    map.removeControl(legend)
    map.removeLayer(map_layer)
    infoBox.css({ visibility: "hidden"})

}
function getColor(d) {
    return d > 134 ? '#3b3b3b' :
            d > 78 ? '#5e5e5e' :
                d > 30 ? '#838383':
                    d > 11 ? '#ababab':
                        d > 0 ? '#d4d4d4':
                            '#ffffff';
}
function getColorProperty(prop) {
    let legendSel = breaksData[selectedLegend]
    let quantiles = [...legendSel.QUAN_BREAKS]
    quantiles.reverse()
    let color = ""
    let colors = [...colors_5]
    colors.reverse()
    for(let i=0; i < quantiles.length; i++) {
        if(prop > quantiles[i]) {
            if (color == "") {

                if(i===0) {
                    
                }
            color = colors[i]
        }
            
        }
    }
    if(!color) {
        color = colors_5[0]
    }
    return color;
}
function resetMapLayer(map, sel) {
    selectedLegend = sel;
    map_layer.eachLayer( (layer) => {
        layer.setStyle(style(layer.feature))
    })
    map.removeControl(legend)
    legend.addTo(map)
}
function style(feature) {
    let property = selectedLegend
    return {
        weight: 1.0,
        opacity: 1.0,
        color: 'black',
        fillOpacity: 0.8,
        fillColor: getColorProperty(feature.properties[property]),
        interactive:true
    }
}
function highlightFeature(e) {
    var layer = e.target;
     layer.setStyle(
        {
            opacity:0.7,
            fillOpacity:0.7,
        }
    ); 

    if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
        layer.bringToFront();
    }
    updateInfoBox(layer.feature)


}
function clearInfoBox() {
    infoBox.html(`
    <h3> Hover over a state </h3>`)
}
function updateInfoBox(feature) {
    feature = feature.properties    
    infoBox.html(`
    <h3> ${feature.NAME10}  </h3> 
    <div style='width:100%; text-align:center;'>
    <p> Number of Incidents: ${feature.NUMPOINTS}</p>

     </div>
     <span style='text-align:center'> Click on <b> ${feature.NAME10} </b> for more info </span>
    `)
}
function loadCensusData(feature) {
    console.log(feature.properties)
    let props = feature.properties
    let mapQueryDiv = $('#query-container')
    let html = `
    <div class='point-query-container'> 
    <div class='point-query-header'> 
    
    <h2> ${props.NAME10} </h2> <h4> Reported Incidents: ${props.NUMPOINTS} </h4>
    <b> Reported Incidents per 100,000 people: </b> ${((props.NUMPOINTS/props.POP_TOTAL) * 100000).toFixed(2)}
    </div> 
    <div class="relative-fill">
    <div class="point-queries">
    <div class = "state-info-container">
    <h3> Demographics </h3>
    <p> Demographic data is obtained from the <a href="https://www.census.gov/"> U.S Census Bureau </a> and the <a href="https://ajpp.brandeis.edu"> American Jewish Population Project</a>.
    <ul> 
    <li> <b> Population Density: </b> ${props.POP_DENS} per sq. mi. </li>
    <li> <b> Total Population: </b> ${props.POP_TOTAL.toLocaleString()} </li> <br>
    <li> <b> Jewish Population:  </b> ${props.POP_JEW_TO.toLocaleString()} </li>
    <li> <b> Jewish Population (%):  </b> ${(props.PCT_JEW_TO * 100).toFixed(2)} </li> <br>

    <li> <b> Black Population:  </b> ${props.POP_BLACK.toLocaleString()} </li>
    <li> <b> Black Population (%):  </b> ${(props.PCT_BLACK * 100).toFixed(2)} </li> <br>
    <li> <b> White Population:  </b> ${props.POP_WHITE.toLocaleString()} </li>
    <li> <b> White Population (%):  </b> ${(props.PCT_WHITE * 100).toFixed(2)} </li> <br>
    </ul>
    <h3> Reported Hate Groups </h3>
    <p> Hate group data is obtained from the <a href="https://www.splcenter.org/hate-map" >Southern Poverty Law Center Hate Map </a> </p>
    <ul>
    <li> <b> 2016: </b> ${props.COUNT2016} </li>
    <li> <b> 2017: </b> ${props.COUNT2017} </li>
    <li> <b> 2018: </b> ${props.COUNT2018} </li>
    <li> <b> 2019: </b> ${props.COUNT2019} </li>
    <li> <b> 2020: </b> ${props.COUNT2020} </li>
    <li> <b> 2021: </b> ${props.COUNT2021} </li>
    </ul>
    </div>
    </div>
    </div>
    </div>`
    mapQueryDiv.html(html)
    if (sideBarCollapsed) {
        handleSidebarCollapse();
    }
}
function resetHighlight(e) {
    map_layer.resetStyle(e.target);
    clearInfoBox();
}

function zoomToFeature(e) {
    console.log(map)
   // map.fitBounds(e.target.getBounds());
    loadCensusData(e.target.feature)
}

function onEachFeature(feature, layer) {
    layer.on({
        mouseover: highlightFeature,
        mouseout: resetHighlight,
        click: zoomToFeature
    });
}

let legend = L.control({ position: 'bottomright' });

legend.onAdd = function (map) {
    let legendSel = breaksData[selectedLegend]
    var div = L.DomUtil.create('div', 'info legend'),
        quantile = legendSel.QUAN_BREAKS,
        grades = legendSel.QUAN_BREAKS,
        labels = [],
        from, to;

    for (var i = 0; i < grades.length; i++) {
        from = grades[i];
        to = grades[i + 1];
        let label = quantile[i]
        let next_label = quantile[i+1]
        let max = legendSel.MAX
        if (selectedLegend.startsWith('PCT')) {
            label = (label *100).toFixed(2)
            next_label = (next_label *100).toFixed(2)
            max = (legendSel.MAX * 100).toFixed(2)
        }
        labels.push(
            '<i style="background:' + getColorProperty(from + 0.00001) + '"></i> ' +
            label + (quantile[i+1] ? ' &ndash; ' + next_label : ' &ndash; ' + max));
    }

    div.innerHTML = `<h3> ${legendSel.NAME} </h3>`  + labels.join('<br style="margin-bottom: 4px">');
    return div;
};