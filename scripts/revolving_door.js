document.addEventListener('DOMContentLoaded', () => {
    const doorWrapper = document.querySelector('.door-wrapper');
    const slider = document.querySelector('#rotation-slider');
    const images = [
        '../images/john_wayne.jpg',
        '../images/kibbie.jpg',
        '../images/cannoli.jpg',
        '../images/baylor_logo.jpg',
        '../images/tiger_stadium.jpg',
    ]; // Add as many image paths as you want here

    let currentRotation = 0;

    console.log('Revolving door script loaded!');

    if (!doorWrapper || !slider) {
        console.error('Required elements not found!');
        return;
    }

    // Dynamically create door panels
    const totalImages = images.length;
    const angleIncrement = 360 / totalImages; // Calculate rotation angle for each panel

    images.forEach((src, index) => {
        const panel = document.createElement('div');
        panel.classList.add('door-panel');
        panel.style.transform = `rotateY(${index * angleIncrement}deg) translateZ(300px)`; // Adjust translateZ for spacing
        const img = document.createElement('img');
        img.src = src;
        img.alt = `Image ${index + 1}`;
        panel.appendChild(img);
        doorWrapper.appendChild(panel);
    });

    // Automatic rotation
    setInterval(() => {
        currentRotation -= 0.5; // Slower rotation speed
        doorWrapper.style.transform = `rotateY(${currentRotation}deg)`;
    }, 50); // Adjust speed by changing the interval

    // Slider control
    slider.addEventListener('input', (e) => {
        currentRotation = e.target.value * 0.5; // Reduce sensitivity
        doorWrapper.style.transform = `rotateY(${currentRotation}deg)`;
    });

    console.log('Script is running!');
    doorWrapper.style.transform = 'rotateY(45deg)';
});
