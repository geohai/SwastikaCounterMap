let sideBarCollapsed = true;
loadClickEvents();

function loadClickEvents() {
    let collapseBtn = $('#collapse-btn')
    let pointFilterBtn = $('#point-filter-btn')
    let mapQueryDiv = $('#query-container')
    let legendSelect = $('#legendSelect')

    collapseBtn.click(() => {
       
        handleSidebarCollapse();
        console.log(sideBarCollapsed)
    });
}
function handleSidebarCollapse() {
    let collapseBtn = $('#collapse-btn')
    sideBarCollapsed = !sideBarCollapsed
    $('.map-query').toggleClass('collapsed')
    if (sideBarCollapsed) {
        collapseBtn.css( {
            'visibility': 'hidden'
        })
    } else {
        collapseBtn.css( {
            'visibility': 'visible'
        })
    }
}
export {handleSidebarCollapse , sideBarCollapsed}