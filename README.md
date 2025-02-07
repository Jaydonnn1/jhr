<html lang="en">
<head>
    <link rel="canonical" href="https://joshhaydonrowe.com/" />
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    
    <title>Josh Haydon Rowe</title>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
    
<style>
    body {
        font-family: Arial, sans-serif;
        margin: 0;
        padding: 0;
        background-color: #000000;
    }

    .top-nav {
        position: fixed;
        top: 20px;
        right: 20px;
        display: flex;
        gap: 15px;
        z-index: 1000;
    }

    .top-nav a {
        text-decoration: none;
        color: #fff;
        padding: 10px 20px;
        border: 1px solid #fff;
        border-radius: 5px;
        transition: all 0.3s ease;
        background-color: transparent;
    }

    .top-nav a:hover {
        background-color: #fff;
        color: #000;
    }

    .header-content {
        text-align: center;
        padding: 40px 0;
        color: #fff;
        position: relative;
        z-index: 1;
    }

    .header-content h1 {
        font-size: 2.5em;
        margin-bottom: 10px;
    }

    .header-content p {
        font-size: 1.2em;
    }

    section {
        padding: 50px;
        color: #fff;
        position: relative;
        z-index: 1;
        background-color: rgba(0, 0, 0, 0.7);
    }

    h2 {
        text-align: center;
    }

    .travel-buttons button {
        padding: 10px 20px;
        margin: 5px;
        cursor: pointer;
        background-color: transparent;
        color: #fff;
        border: 1px solid #fff;
        border-radius: 5px;
        transition: all 0.3s ease;
    }

    .travel-buttons button:hover {
        background-color: #fff;
        color: #000;
    }

    #globe-container {
        background-color: #000000;
        width: 100vw;
        height: 100vh;
        position: fixed;
        top: 0;
        left: 0;
        z-index: 0;
    }
    
    #globe-canvas {
        position: absolute;
        width: 100%;
        height: 100%;
        top: 0;
        left: 0;
    }

    .viewing-space {
        height: 100vh;
        background: transparent;
    }
</style>
</head>

<body>
    <div id="globe-container">
        <canvas id="globe-canvas"></canvas>
    </div>
    
    <div class="top-nav">
        <a href="#engineering">Engineering</a>
        <a href="#travels">Travels</a>
    </div>

    <div class="header-content">
        <h1>Josh Haydon Rowe</h1>
        <p>Welcome to My Personal Website</p>
    </div>

    <section id="introduction">
        <h2>Introduction</h2>
        <p>I am a senior majoring in chemical engineering at the University of Edinburgh with a year abroad at UC Berkeley, with research experience at Yale, and a few months interning at Tesla. I'm interested in renewable energy sources, climate tech, global exploration, language learning & a little surfing on the side.</p>
    </section>

    <section id="engineering">
        <h2>Engineering</h2>
        <p>This section is dedicated to engineering.</p>
    </section>

    <section id="travels">
        <h2>Travels</h2>
        <p>Explore my travel adventures:</p>
        <div class="travel-buttons">
            <button onclick="location.href='mexico-to-colombia.html'">Mexico to Nicaragua</button>
            <button onclick="location.href='lima-to-ushuaia.html'"> Around Peru and it's neighbours</button>
        </div>
    </section>

    <div class="viewing-space"></div>
    
    <script src="globe.js"></script>
    <script>
        document.addEventListener('DOMContentLoaded', () => {
            const globe = new Globe();
            
            window.addEventListener('resize', () => {
                globe.camera.aspect = window.innerWidth / window.innerHeight;
                globe.camera.updateProjectionMatrix();
                globe.renderer.setSize(window.innerWidth, window.innerHeight);
            });
        });
    </script>
</body>
</html>
