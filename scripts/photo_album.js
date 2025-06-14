document.addEventListener('DOMContentLoaded', () => {
    const albumWrapper = document.querySelector('.album-wrapper');
    const slider = document.querySelector('#album-slider');

    if (!albumWrapper || !slider) {
        console.error('Required elements not found!');
        return;
    }

    // Calculate maximum scrollable width
    const maxScroll = albumWrapper.scrollWidth - albumWrapper.offsetWidth;

    // Update slider max value dynamically
    slider.max = maxScroll;

    // Slider control for horizontal scrolling
    slider.addEventListener('input', (e) => {
        const scrollValue = e.target.value;
        albumWrapper.style.transform = `translateX(-${scrollValue}px)`;
    });
});