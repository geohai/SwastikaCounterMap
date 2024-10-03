let infoHover = document.getElementById('mouse-info-box')



function displayText(head, body) {
    infoHover.style.opacity = 1
    infoHover.innerHTML = `<h3>${head}</h3> ${body}`
}
function hideBox() {
    infoHover.style.opacity = 0
}
hideBox()