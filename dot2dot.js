Markers = new Mongo.Collection('markers');
var startingLocationLat = 42.0564594;
var startingLocationLng = -87.677455717
var startingLocation = null;

var comMarker = null;


function defineSimplify(){
    google.maps.Polyline.prototype.simplifyLine = function(tolerance){
	var res = null;
	
	if(this.getPath() && this.getPath().getLength()){
            var points = this.getPath().getArray();
	    console.log("points we got", points.map(function(x){return {lat:x.lat(),lng:x.lng()}}));
            var Line = function( p1, p2 ) {
		this.p1 = p1;
		this.p2 = p2;
		
		this.distanceToPoint = function( point ) {
		    if ((this.p1.lat() == this.p2.lat()) && (this.p1.lng() == this.p2.lng())) 
			return  Math.sqrt( Math.pow( ( point.lng() - this.p1.lng() ), 2 ) + Math.pow( ( point.lat() - this.p1.lat() ), 2 ) )

                    // slope
                    var m = ( this.p2.lat() - this.p1.lat() ) / ( this.p2.lng() - this.p1.lng() ),
                    // y offset
                    b = this.p1.lat() - ( m * this.p1.lng() ),
                    d = [];
                    // distance to the linear equation
                    d.push( Math.abs( point.lat() - ( m * point.lng() ) - b ) / Math.sqrt( Math.pow( m, 2 ) + 1 ) );
                    // distance to p1
                    d.push( Math.sqrt( Math.pow( ( point.lng() - this.p1.lng() ), 2 ) + Math.pow( ( point.lat() - this.p1.lat() ), 2 ) ) );
                    // distance to p2
                    d.push( Math.sqrt( Math.pow( ( point.lng() - this.p2.lng() ), 2 ) + Math.pow( ( point.lat() - this.p2.lat() ), 2 ) ) );
                // return the smallest distance
                return d.sort( function( a, b ) {
                    return ( a - b ); //causes an array to be sorted numerically and ascending
                } )[0];
            };
        };

        var douglasPeucker = function( points, tolerance ) {
 //console.log("points this round ", points.map(function(x){return {lat:x.lat(),lng:x.lng()}}));

            if ( points.length <= 2 ) {
                return [points[0]];
            }
            var returnPoints = [],
                // make line from start to end 
                line = new Line( points[0], points[points.length - 1] ),


                // find the largest distance from intermediate poitns to this line
                maxDistance = 0,
                maxDistanceIndex = 0,
                p;

//	    console.log("making line between " +  points[0].lat() + ","+points[0].lng() + " and " + points[points.length - 1].lat() + ","+points[points.length-1].lng())
	    
            for( var i = 1; i <= points.length - 2; i++ ) {
		
                var distance = line.distanceToPoint( points[ i ] );

//		console.log("considering...", points[i].lat(), points[i].lng())

		if( distance > maxDistance ) {
                    maxDistance = distance;
                    maxDistanceIndex = i;
                }
            }

	    console.log("tolerance:", tolerance)
	    console.log("maxDist:", maxDistance)
	    console.log("maxDistIndex:", maxDistanceIndex)

            // check if the max distance is greater than our tollerance allows 
            if ( maxDistance >= tolerance ) {
                p = points[maxDistanceIndex];

		console.log("including... ", maxDistanceIndex)

                line.distanceToPoint( p, true );
                // include this point in the output 
		console.log("calling with 0 to ", (maxDistanceIndex ))

                returnPoints = returnPoints.concat( douglasPeucker( points.slice( 0, maxDistanceIndex + 1 ), tolerance ) );
                // returnPoints.push( points[maxDistanceIndex] );
		
		console.log("calling with  ", (maxDistanceIndex), " to ", (points.length -1) )

                returnPoints = returnPoints.concat( douglasPeucker( points.slice( maxDistanceIndex, points.length ), tolerance ) );
            } else {
                // ditching this point
                p = points[maxDistanceIndex];

		console.log("ditching " +  maxDistanceIndex + ": " +  p.lat() + ", " + p.lng())

                line.distanceToPoint( p, true );
                returnPoints = [points[0]];
            }

            return returnPoints;
        };
        res = douglasPeucker( points, tolerance );
        // always have to push the very last point on so it doesn't get left off
        res.push( points[points.length - 1 ] );
    }
	
	console.log("simplified: ", res.map(function(x){return {lat:x.lat(),lng:x.lng()}}));
	console.log("our simplified shape is " + res.length +"-sided.")
    return res;
    };
    
  }


function updateLabels(){
    var com = updateCOM();
    var points = Markers.find().fetch();
    var angle = [];
    
    for (var i = 0; i < points.length; i++) {
	points[i].angle = Math.atan2(points[i].lat - com.lat, points[i].lng - com.lng) * 180 / Math.PI;
//	if (points[i].angle < 0) 
//	    points[i].angle += 360
    }
    
    points.sort(function(a,b) {
	if (a.angle < b.angle)
	    return 1;
	if (a.angle > b.angle)
	    return -1;
	return 0;
    });
    
//    console.log("angles: " + points.map(function (x) { return x.angle}))

    for (var i = 0; i < points.length; i++) {
	
	Markers.update(points[i]._id, {$set: 
				       {'labelUrl': 
					'http://google-maps-icons.googlecode.com/files/teal0' + i + '.png',
					'number': i
					
				       }})
    }
}

function updateCOM(){
    var points = Markers.find().fetch();
    var totalLat = 0;
    var totalLng = 0;
    for (var i = 0; i < points.length; i++) {
	totalLat += points[i].lat;
	totalLng += points[i].lng;
    }
    var com = {lat: totalLat / points.length, lng: totalLng / points.length};
    
    comMarker.setPosition(new google.maps.LatLng(com.lat, com.lng))

    return com
}
    

if (Meteor.isClient) {
  Template.map.onCreated(function() {
    GoogleMaps.ready('map', function(map) {
	defineSimplify();
	var markers = {};
	var bounds = new google.maps.LatLngBounds();
	bounds.extend(startingLocation);

	comMarker = new google.maps.Marker({
	    draggable: false,
	    animation: google.maps.Animation.DROP,
	    position: new google.maps.LatLng(startingLocationLat, startingLocationLng),
	    map: map.instance,
	    id: "COM",
	    title: "center of mass",
	    icon: 'https://maps.gstatic.com/mapfiles/ms2/micons/green-dot.png'
	});
	
	
	Markers.find().observe({
            added: function (document) {
		var marker = new google.maps.Marker({
		    draggable: false,
		    animation: google.maps.Animation.DROP,
		    position: new google.maps.LatLng(document.lat, document.lng),
		    map: map.instance,
		    id: document._id,
		    title: document.name,
		    icon: ('labelUrl' in document) ? document.labelUrl : 'https://maps.gstatic.com/mapfiles/ms2/micons/red-dot.png'
		    
		});
		
		markers[document._id] = marker;
		bounds.extend(marker.position);
            },
            changed: function (newDocument, oldDocument) {
		markers[newDocument._id].setPosition({ lat: newDocument.lat, lng: newDocument.lng });
		if('labelUrl' in newDocument){
		    markers[newDocument._id].setIcon(newDocument.labelUrl);
		}
            },
            removed: function (oldDocument) {
		markers[oldDocument._id].setMap(null);
		google.maps.event.clearInstanceListeners(markers[oldDocument._id]);
		delete markers[oldDocument._id];
            }
	});
	

	// Create the search box and link it to the UI element.
	var input = /** @type {HTMLInputElement} */(
	    document.getElementById('pac-input'));
	map.instance.controls[google.maps.ControlPosition.TOP_LEFT].push(input);
	
	var searchBox = new google.maps.places.SearchBox(
	    /** @type {HTMLInputElement} */(input));
	
	// [START region_getplaces]
	// Listen for the event fired when the user selects an item from the
	// pick list. Retrieve the matching places for that item.
	google.maps.event.addListener(searchBox, 'places_changed', function() {
	    var places = searchBox.getPlaces();
	    
	    if (places.length == 0) {
		return;
	    }else {
	    	var place = places[0]
		place.lat = place.geometry.location.lat()
		place.lng = place.geometry.location.lng()
		place.note = ""
		
		Markers.insert(place)
		map.instance.fitBounds(bounds);
	    }
	})
	// [END region_getplaces]
	
	// Bias the SearchBox results towards places that are within the bounds of the
	// current map's viewport.
	google.maps.event.addListener(map, 'bounds_changed', function() {
	    var bounds = map.getBounds();
	    searchBox.setBounds(bounds);
	});
	
	
    });

  });

  Meteor.startup(function() {
      GoogleMaps.load({key: Meteor.settings.public.googleAPIKey, libraries: 'places'});
  });


  Template.map.helpers({
    mapOptions: function() {
      if (GoogleMaps.loaded()) {
	  if (startingLocation == null)
	      startingLocation = new google.maps.LatLng(startingLocationLat, startingLocationLng);
          return {
	      scrollwheel: false,
              center: startingLocation,
          zoom: 15
        };
      }
    }
  });    

    
    Template.poi.helpers({
	markers: function () { 
	    return Markers.find();
	},
    });
    
    Template.poi.events({
	'click .remove-poi-item': function(e) {
	    e.preventDefault();
	    if (confirm("Delete this item?")) {
		var currentMarker = this._id;
		Markers.remove(currentMarker);
	    }
	}, 
	'input .poi-item-note' : function (e){
	    var value = e.currentTarget.value;
	    Markers.update(this._id, {$set: {'note': value}});
	},
	'input .poi-item-website' : function (e){
	    var value = e.currentTarget.value;
	    Markers.update(this._id, {$set: {'website': value}});
	}
	
    });   

    Template.controls.events({
	'click #load-example-1': function (e) {
	    if (confirm("This loads an example but loses your current markers. Continue?")) {
		var points = Markers.find().fetch();
		for (var i = 0; i < points.length; i++){
		    Markers.remove(points[i]._id);
		}
		
		for (var i = 0; i < example1.length; i++){
		    Markers.insert(example1[i]);
		}
	    }
	},
	
	'click #simplify-shape': function (e) {
	    updateLabels();

	    var points = Markers.find().fetch();
	    points.sort(function(a,b) {
		if (a.number < b.number)
		    return -1;
		if (a.number > b.number)
		    return 1;
		return 0;
	    });
	    
	    var path = points.map(function (x){ return {lat: x.lat, lng: x.lng }});

	    console.log("this is the  path:", path)

// adding closed loop? do:	    path.push(path[0])

	    var pointPath = new google.maps.Polyline({    
		path: path,
		geodesic: true,
		strokeColor: '#FF0000',
		strokeOpacity: 0.7,
		strokeWeight: 8
	    });


	    pointPath.setMap(GoogleMaps.maps.map.instance)

	    // for drawing; we keep the path separate because the simplification algorithm doesn't seem to want the looping segment
	    var closedPath = new google.maps.Polyline({    
		path: [path[path.length -1],
		       path[0]],
		geodesic: true,
		strokeColor: '#FF0000',
		strokeOpacity: 0.7,
		strokeWeight: 8
	    });
	    closedPath.setMap(GoogleMaps.maps.map.instance)


	    var simplifiedLinePath = pointPath.simplifyLine(0.001); // default: .001

	    simplifiedLinePath.push(simplifiedLinePath[0]);

	    var simplifiedLine = new google.maps.Polyline({
		path: simplifiedLinePath,
		geodesic: true,
		strokeColor: '#00FF00',
		strokeOpacity: 0.7,
		strokeWeight: 4,
zIndex: 100
	    })
	    simplifiedLine.setMap(GoogleMaps.maps.map.instance)
	},
	
	'click #label-markers': function (e) {
	    updateLabels();
	},
	
	'click #get-com': function (e) {
	    updateCOM();
	}
    });


}

