import * as stateMap from "./states.js";
import * as countyMap from "./county.js";
import * as pointLayer from './points.js'
import {
    handleSidebarCollapse,
    sideBarCollapsed
} from "./components/sidebar.js";
export {
    infoBox
}
var map;




//point legend
let stateMapOptions;
let selectedOption = 'PCT_JEW_TO'
//legend changer
let stateLegendSelect = $('#legend-select-state')
let countyLegendSelect = $('#legend-select-county')
let legendSelectText = $('#legend-select-text')
//point layer

let outlineLayer;



//Page objects
let infoBox
let mapQuery;

// Current Layer (defines current object) ! polygon
let currentLayer;

window.onload = () => {
    initialize();
}

async function initialize() {
    
    /* Perform initial hiding  and declaration of page objects */
    infoBox = $('.infoBox')
    infoBox.css({
        visibility: "hidden"
    })
    $('#year-text').css({
        visibility: 'hidden'
    })
    mapQuery = $('.map-query')
    /* End block */


    createMap(); // creates leaflet map

    loadPanes();
    // creates panes (for z-indices) for leaflet map
    stateMapOptions = await stateMap.loadBreaks();
    await getData(map) // asynchronous get data (gets data of state, county and point map)

    loadMainMenu();
    countyLegendSelect.hide()
    setPanes();
    pointLayer.loadClickEvents()
    reloadMap('state', selectedOption)





}
/* ########################################################## */
/* ########################################################## */
/*                        MAP CREATION                            */
/* ######################### ################################ */
/* ########################################################## */
function createMap() {
    //create the map

    var maxBounds = L.latLngBounds(
        L.latLng(5.499550, -167.276413), //Southwest
        L.latLng(83.162102, -52.233040)  //Northeast
    );
    //add OSM base tilelayer
    map = L.map('map', {
        minZoom: 4,
        maxZoom: 9,
        scrollWheelZoom: false,
        smoothWheelZoom: true,
        smoothSensitivity: 1,
    }).setView([37.8, -96], 4);
    L.tileLayer('https://tile.jawg.io/83630003-7ed6-4e40-a284-d12ba35b033f/{z}/{x}/{y}{r}.png?access-token=iLuzn3MqdlZEZksWVEVXqX3SU6o5AWsC94JX05GU2IXGAFxHqFeTqHzSE6LwgKAJ', {
        attribution: '&copy; <a href=\"https://www.jawg.io\" target=\"_blank\">&copy; Jawg</a> - <a href=\"https://www.openstreetmap.org\" target=\"_blank\">&copy; OpenStreetMap</a>&nbsp;contributors',
        subdomains: 'abcd'}).addTo(map);
};
function loadPanes() {
    map.createPane("locationMarker")
    map.getPane("locationMarker").style.zIndex =3;
    map.createPane('popup');
    map.getPane("popup").style.zIndex = 4;
    map.createPane("pointFilter")
    map.getPane("pointFilter").style.zIndex = 3;
    map.createPane("labels")
    map.getPane("labels").style.zIndex = 10;
    map.createPane("map")
    map.getPane("map").style.zIndex = 1;

};
function setPanes() {
    map.getPane("locationMarker").style.zIndex =3;
    map.getPane("popup").style.zIndex = 4;
    map.getPane("pointFilter").style.zIndex = 3;
    map.getPane("map").style.zIndex = 5000;
    map.getPane("labels").style.zIndex = 4999;
    map.getPane("labels").style.pointerEvents = 'none';
    map.getPane("map").style.pointerEvents = 'unset';
    map.getPane("overlayPane").style.zIndex = 5001;

}

async function getData(map) {

    await $.getJSON('data/counties.json').then(function (response) {

        countyMap.storeData(response)
       
        return true
    }).then(
    //state layer, just to show state borders ! interactive:false
 
    await $.getJSON('data/STATES_JSON.json').then(function (response) {

        stateMap.storeData(response)

        stateMap.loadLayer(map)
        currentLayer = stateMap;
        stateMap.setParent(this)
        return true

    })).then( 
        setTimeout(() => {
            return true
        }, 100)
    )

    await $.getJSON("data/swastika_data_aug30.geojson").then(async function (response) {
        console.log(response)
        pointLayer.storeData(response)
        pointLayer.loadLayer(map)
        return true


    });
    
};
function addCountyMapOptions() {
    const options = [16, 20]
    let optionCont = $('<div>', {
        'class': 'label-menu',
        'html': '<h4> Electoral </h4>'
    })
    options.forEach(option => {
        let input = $('<input>', {
            type:'radio',
            name:'layers',
            value: option,
            id: option+'-radio',
            checked: option == selectedOption
            
        })
        optionCont.append(input)
        input.on('click', (e)=> {
            selectedOption = e.target.value;
            reloadMap('county', selectedOption)
        })
        optionCont.append($('<label>', {
            for:option+'-radio',
            'html': `20${option} Presidential Election`
        })
    )
})
    return optionCont;

}
function addStateMapOptions() {
    let options = stateMapOptions;
    let optionKeys = Object.keys(options)
    let optionCont = $('<div>', {
        'class': 'label-menu',
        'html': '<h4> Demographic </h4> '
    })
    optionKeys.forEach(option => {
        let input = $('<input>', {
            type:'radio',
            name:'layers',
            value: option,
            id: option+'-radio',
            checked: option == selectedOption
            
        })
        input.on('click', (e)=> {
            selectedOption = e.target.value;
            reloadMap('state', selectedOption)
        })
        optionCont.append(input)
        optionCont.append($('<label>', {
            for:option+'-radio',
            'html': options[option]['NAME']
        })
    )
})
    return optionCont;

}


/* ########################################################## */
/* ########################################################## */
/*                        --UI RELATED--                          */
/* ######################### ################################ */
/* ########################################################## */


function loadMainMenu() {
    let menu = $('#map-menu')
    let notifierActive = false
    menu.html('')
    let layerBtn = createMenuBtn('svg/layer-icon.svg', 'Layers')
    let pointBtn = createMenuBtn('svg/location.svg', 'Filter Incidents')
    let shareBtn = createMenuBtn('svg/share.svg', 'Share')
    let helpBtn = createMenuBtn('svg/faq.svg', 'Help')
    let helpExit = $('<button>', {
        'html': 'Go Back'
    })
    helpExit.appendTo('#help-header')
    let layersCont = $('<div>', {
        class:'layers-cont sub-collapsed'
    })

    layerBtn.appendTo(menu)
    let stateOptions = addStateMapOptions();
    let electionOptions = addCountyMapOptions();
    let layerMenu = $('<div>', {
        'class': 'layer-menu-cont'
    })
    layerMenu.append(stateOptions)
    layerMenu.append(electionOptions)
    
    layerMenu.appendTo(layersCont)
    layersCont.appendTo(menu)

    layerBtn.on('click', () => {
        layersCont.toggleClass('sub-collapsed')
        $('#menu').toggleClass('selected')
        pointBtn.toggleClass('mobile-btn-hide')
        shareBtn.toggleClass('mobile-btn-hide')
        helpBtn.toggleClass('mobile-btn-hide')
    })
    helpBtn.on('click', ()=> {
        $('#help-menu').toggleClass('menu-collapsed')
        $('#map-menu').toggleClass('menu-collapsed')
        $('#menu').toggleClass('extended')  
    })
    helpExit.on('click', ()=> {
        $('#help-menu').toggleClass('menu-collapsed')
        $('#map-menu').toggleClass('menu-collapsed')
        $('#menu').toggleClass('extended')          
    })

    pointBtn.appendTo(menu)
    pointBtn.attr('id', 'point-filter-btn')
    helpBtn.appendTo(menu)
    shareBtn.appendTo(menu)


    shareBtn.on('click', ()=> {
        $('#share-menu').toggleClass('menu-collapsed')
        $('#map-menu').toggleClass('menu-collapsed')
        $('#menu').toggleClass('extended')             
    })
    $('#share-back').on('click', ()=> {
        $('#share-menu').toggleClass('menu-collapsed')
        $('#map-menu').toggleClass('menu-collapsed')
        $('#menu').toggleClass('extended')          
    })
    $('#copy-site').on('click', ()=> {
        var copyText = $('#website')[0];
        console.log(copyText)
        navigator.clipboard.writeText(copyText.value);
    })
    $('#copy-map').on('click', ()=> {
        var copyText = $('#full-map')[0];
        navigator.clipboard.writeText(copyText.value);
    })
}

function createMenuBtn(icon, text) {
    let menuCont = $('<div>', {
        'class': 'menu-btn-cont'
    })
    let btnContainer = $('<div>', {
        'class': 'menu-btn',
    })

    let svg = $('<img>', {
        'class': 'icon',
        'src':icon
    })
    let btn = $('<div>', {
        'html':text,
        'class': 'menu-btn-text'
    })
    svg.appendTo(btnContainer)
    btn.appendTo(btnContainer)
    btnContainer.appendTo(menuCont)
    return menuCont;

}

function reloadMap(type, val) {
        clearCurrentLayer();
        pointLayer.refreshLegend();
        switch (type) {
            case 'county':

                countyMap.loadLayer(map)
                countyMap.resetMapLayer(map, val)
                
                currentLayer = countyMap;
                
                break;
            case 'state':
                stateMap.loadLayer(map)
                stateMap.resetMapLayer(map, val)
                currentLayer = stateMap;
                
                
                break;
            case 'none':
                console.log('no layer selected')
                break;
        }
        
;
}

function clearCurrentLayer() {
    if (currentLayer) {
        currentLayer.clearLayer(map);
        currentLayer = null;
    }
}


















