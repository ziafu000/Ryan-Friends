var botToTopBtb = document.getElementById('botToTopBtn');
window.onscroll = function () {
    var position = document.documentElement.scrollTop;
    if (position >500){
        botToTopBtb.style.display='block'
    }else{
        botToTopBtb.style.display='none'
    }
}
function botToTop(){
    window.scrollTo({top: 0, behavior: "smooth"});
}