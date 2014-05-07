(function(){
  var VIZ ={};
  var camera, renderer, controls, scene = new THREE.Scene();
  var width = window.innerWidth, height = window.innerHeight;
  var mapWidth = 750, mapHeight = 400, format = d3.format(".1f");

  VIZ.center = new THREE.Object3D();
  VIZ.center.position.x = 0;
  VIZ.center.position.y = 0;
  VIZ.center.position.z = 3700;

  VIZ.state = 'grid', VIZ.activeMap;

  camera = new THREE.PerspectiveCamera(40, width/height , 1, 10000);
  camera.position.z = 4500;
  camera.setLens(30);

  VIZ.drawElements = function (mapList, data) {
    VIZ.count = mapList.length;

    var elements = d3.selectAll('.map-div')
      .data(mapList).enter()
      .append("div")
        .attr("class", "map-div")
        .each(function (d) {

          d3.select(this).append("div")
            .attr("class", "map-title")
            .html(function (d) { 
              var text = " - 2010 Incidence Rates by State"
              return d.title + text; 
            });

          d3.select(this).append("div")
            .attr("class", "map-caption")
            .html("2010 CDC Cancer Data");

          d3.select(this).append("div")
            .attr("class", function (d) { 
              return d.elem + " map-rollover"; 
            });

          d3.select(this).append("div")
            .attr("class", "map-container")
            .style("height", mapHeight + "px")
            .attr("id", function (d) { return d.elem; });

          VIZ.drawMap(data, d.elem);
        })

    elements.each(setData);
    elements.each(addToScene);

    // MOVE ZOOM CONTROLS IN FRONT OF MAP
    d3.selectAll(".leaflet-top.leaflet-left")
      .style("transform", "translate3d(0px, 0px, 5px)")
      .style("-webkit-transform", "translate3d(0px, 0px, 5px)")

    // MOVE LEGENDS IN FRONT OF MAP
    d3.selectAll(".map-legend")
      .style("transform", "translate3d(0px, 0px, 5px)")
      .style("-webkit-transform", "translate3d(0px, 0px, 5px)")

  }

  var getLegendHTML = function (scale) {
    var grades = scale.quantiles();
    var labels = [], from, to;

    for (var i = 0; i < grades.length; i++) {
      from = d3.format(".2f")(grades[i]);
      to = grades[i + 1] ? d3.format(".2f")(grades[i + 1]): false;

      labels.push(
        '<li><span class="swatch" style="background:' + 
        scale(grades[i]) + '"></span> ' +
        from + (to ? '&ndash;' + to : '+') + '</li>');
    }
    return '<span>Incidence Rate (Quartiles)</span><ul>' + labels.join('') + '</ul>';
  }

  VIZ.drawMap = function (data, elemID) {

    var scale = d3.scale.quantile()
      .range(["#e4baa2","#d79873","#c97645","#bc5316","#8d3f11"]);

    var values = data.features.map(function (d) {
     return d.properties.data[elemID].inc;
    });

    scale.domain(d3.extent(values.filter(function (d) {
      return d >= 0;
    })));

    var map = L.mapbox.map(elemID)
      .setView([37.8, -96], 4);

    var tileLayer = L.mapbox.tileLayer('delimited.ho6391dg', {noWrap: true})
      .addTo(map);

    map.touchZoom.disable();
    map.doubleClickZoom.disable();
    map.scrollWheelZoom.disable();

    var geoLayer = L.geoJson(data, {
      style: getStyleFun(scale, elemID),
      onEachFeature: onEachFeature
    }).addTo(map);
    
    map.legendControl.addLegend(getLegendHTML(scale));
  }

  var getStyleFun = function (scale, elemID) {
    return function (feature) {
      var data = feature.properties.data;
      return {
        fillColor: scale(data[elemID].inc),
        weight: 1,
        opacity: 1,
        color: 'grey',
        dashArray: '3',
        fillOpacity: 0.6
      };
    }
  }

  var addToScene = function (d) {
    var object = new THREE.CSS3DObject(this);
    object.position = d.random.position;
    object.name = d.elem;
    scene.add(object);
  }

  var setData = function (d, i) {
    var vector, phi, theta;
    var random, sphere, grid;

    random = new THREE.Object3D();
    random.position.x = Math.random() * 4000 - 2000;
    random.position.y = Math.random() * 4000 - 2000;
    random.position.z = Math.random() * 4000 - 2000;
    d['random'] = random;

    sphere = new THREE.Object3D();
    phi = Math.acos( -1 + ( 2 * i ) / VIZ.count );
    theta = Math.sqrt( VIZ.count * Math.PI ) * phi;
    vector = new THREE.Vector3();
    sphere.position.x = 1200 * Math.cos( theta ) * Math.sin( phi );
    sphere.position.y = 1200 * Math.sin( theta ) * Math.sin( phi );
    sphere.position.z = 1200 * Math.cos( phi );
    vector.copy( sphere.position ).multiplyScalar( 2 );
    sphere.lookAt( vector );
    d['sphere'] = sphere;

    grid = new THREE.Object3D();
    grid.position.x = (( i % 5 ) * 1050) - 2000;
    grid.position.y = ( - ( Math.floor( i / 5 ) % 5 ) * 650 ) + 800;
    grid.position.z = 0;
    d['grid'] = grid;
  }

  var onEachFeature = function (feature, layer) {
    layer.on({
        mouseover: mouseover,
        mouseout: mouseout
    });
  }

  var mouseover = function (e) {
    var layer = e.target;
    layer.setStyle({
        weight: 2,
        color: 'tomato',
        dashArray: '',
        fillOpacity: 0.5
    });
    if (!L.Browser.ie && !L.Browser.opera) {
        layer.bringToFront();
    }
  }

  var mouseout = function (e) {
    var layer = e.target;
    layer.setStyle({
        weight: 1,
        opacity: 1,
        color: 'grey',
        dashArray: '3',
        fillOpacity: 0.6
    });
    if (!L.Browser.ie && !L.Browser.opera) {
        layer.bringToFront();
    }
  }

  VIZ.render = function () {
    renderer.render(scene, camera);
  }

  VIZ.transform = function () {
    var arr, duration = 1000;
    if (arguments.length > 0) {
      arr = Array.prototype.slice.call(arguments, 0);
      controls.reset();
    }else {
      arr = scene.children;
    }

    TWEEN.removeAll();

    arr.forEach(function (object){
      var newPos, newRot, coords, rotate, update;

      if (object.newPos) {
        newPos = object.newPos.position;
        newRot = object.newPos.rotation;
      } else {
        newPos = object.element.__data__[VIZ.state].position;
        newRot = object.element.__data__[VIZ.state].rotation;
      }

      coords = new TWEEN.Tween(object.position)
        .to({x: newPos.x, y: newPos.y, z: newPos.z}, duration)
        .easing(TWEEN.Easing.Sinusoidal.InOut)
        .start();

      rotate = new TWEEN.Tween(object.rotation)
        .to({x: newRot.x, y: newRot.y, z: newRot.z}, duration)
        .easing(TWEEN.Easing.Sinusoidal.InOut)
        .start();
    });
    
   update = new TWEEN.Tween(this)
     .to({}, duration)
     .onUpdate(VIZ.render)
     .start();
  }

  VIZ.animate = function () {
    requestAnimationFrame(VIZ.animate);
    TWEEN.update();
    controls.update();
  }

  renderer = new THREE.CSS3DRenderer();
  renderer.setSize(width, height);
  renderer.domElement.style.position = 'absolute';
  document.getElementById('container').appendChild(renderer.domElement);

  controls = new THREE.TrackballControls(camera, renderer.domElement);
  controls.rotateSpeed = 0.5;
  controls.minDistance = 100;
  controls.maxDistance = 6000;
  controls.addEventListener('change', VIZ.render);

  VIZ.resetControls = controls.reset;

  VIZ.onWindowResize = function () {
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    VIZ.render();
  }
  window.VIZ = VIZ;
}())