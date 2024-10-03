let legend = L.control({ position: 'bottomright' });
let data;
let map_layer;
let map;
let infoBox = $('.infoBox')
const breaks = [0.4, 0.5, 0.6, 0.7, 0.8, 0.9]
const demColors = ['#a5b0ff', '#8e99fd', '#7881f9', '#6369f4', '#4e4fed', '#3933e5']
const gopColors = ['#ffb2b2', '#f29390', '#e4746e', '#d2554b', '#be3428', '#a80000']
const years = ['16', '20']
let selectedYear = '16'
export {loadLayer, storeData, clearLayer, resetMapLayer, data }
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
function clearLayer(map, legendSelected) {
    map.removeControl(legend)
    map.removeLayer(map_layer)
    infoBox.css({ visibility: "hidden"})

}
function resetMapLayer(map, sel) {
    selectedYear = sel;
    map_layer.eachLayer( (layer) => {
        layer.setStyle(style(layer.feature))
    })
    map.removeControl(legend)
    legend.addTo(map)
}
legend.onAdd = function (map) {

        var div = L.DomUtil.create('div', 'info legend'),
            quantile = ['40%', '50%', "60%", "70%", "80%", "90%"],
            grades = breaks,
            gopLabels = [],
            demLabels = [],
            from, to;

        for (var i = 0; i < grades.length; i++) {
            from = grades[i];
            to = grades[i + 1];

            gopLabels.push(
                '<i style="background:' + processResultColor(from, gopColors) + '"></i> ' +
                 "Republican >= " + quantile[i]);
        }
        for (var i = 0; i < grades.length; i++) {
            from = grades[i];
            to = grades[i + 1];

            demLabels.push(
                '<i style="background:' + processResultColor(from, demColors) + '"></i> ' +
                "Democrat >= " + quantile[i])
        }

        div.innerHTML = ` <h3> 20${selectedYear} U.S. Presidential Elections </h3>`  + '<div class="legend-flex">'
        + '<div class="legend-body">' + 
        gopLabels.join('<br style = "margin-bottom:3px">') + 
        '</div>' + '<div class ="legend-body">' + 
        demLabels.join('<br style = "margin-bottom:3px">')
        + '</div> </div>';
        return div;
    };

    
function getColor(d) {
    return d > 0.750 ? '#C93135' :
              d > 0.500 ? '#DB7171' :
                d > 0.250 ? '#EAA9A9' :
                  d > 0.000 ? '#FCE0E0' :
                    d > -0.250 ? '#CEEAFD' :
                        d > -0.500 ? '#92BDE0' :
                            d > -0.750 ? '#5295CC' :
                                            '#1375B7';
}
function processResultColor(property, colors) { // !!! Solely for the legend
    let prop = property
    let color = "transparent"
    for(let i=0; i<breaks.length; i++) {
        if(prop >= breaks[i]) {
            color = colors[i]
        }
    }
    return color;
}
function getElectionColor(feature) { /// For leaflet layer
    let prop_gop = feature.properties[`${selectedYear}_PCT_GOP`]
    let prop_dem = feature.properties[`${selectedYear}_PCT_DEM`]
    let colors = demColors
    let prop = prop_dem
    if(prop_gop > prop_dem) {
        colors = gopColors
        prop = prop_gop
    }
    let color = "transparent"
    for(let i=0; i<breaks.length; i++) {
        if(prop >= breaks[i]) {
            color = colors[i]
        }
    }
    return color;
    

}
function style(feature) {
    return {
        weight: 0.6,
        opacity: 0.8,
        color: 'white',
        fillOpacity: 1,
        fillColor: getElectionColor(feature)
    };
}

function highlightFeature(e) {
    var layer = e.target;

    layer.setStyle({
        weight: 4,
        color: '#000',
        dashArray: '',
        fillOpacity: 0.7
    });

    if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
        layer.bringToFront();
    }
    updateInfoBox(layer.feature)


}
function clearInfoBox() {
    infoBox.html(`
    <h3> Hover over a county </h3>`)
}
function updateInfoBox(feature) {
    feature = feature.properties    
    infoBox.html(`
    <h3> ${feature.area_name}, ${feature.state_abbr}  </h3> 
    <ul>
    <li> Percent Democrat: ${feature[`${selectedYear}_PCT_DEM`].toFixed(2)}</li>
    <li> Percent GOP: ${feature[`${selectedYear}_PCT_GOP`].toFixed(2)} </li>
    <li> Total Votes: ${feature[`${selectedYear}_TO_VO`]} </li>
     </ul>
    `)
}
function resetHighlight(e) {
    map_layer.resetStyle(e.target);
    clearInfoBox();
}

function zoomToFeature(e) {
    console.log(map)
    map.fitBounds(e.target.getBounds());
}

function onEachFeature(feature, layer) {
    layer.on({
        mouseover: highlightFeature,
        mouseout: resetHighlight,
        click: zoomToFeature
    });
}
