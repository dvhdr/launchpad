var theUniverse = null;

var numRows = 8,
	numCols = 8;

window.addEventListener('load', function() 
{
	theUniverse = document.getElementById("universe");

	for (var i=0; i<numRows; i++) 
    {
		var rowElem = document.createElement("div");
		rowElem.className = "row";
		rowElem.row = i;
		for (var j=0; j<numCols; j++) 
        {
			var cellElem = document.createElement("div");
			cellElem.row = i;
			cellElem.col = j;
			cellElem.onclick = flipHandler;
			cellElem.className = "cell";

			rowElem.appendChild(cellElem);
		}
		theUniverse.appendChild(rowElem);
	}
	navigator.requestMIDIAccess().then( onMIDIInit );
} );

var midiAccess = null;
var midiIn = null;
var midiOut = null;
var launchpadFound = false;

function onMIDIInit( midi ) 
{
  midiAccess = midi;

  // inputs
  var list=midiAccess.inputs();

  for (var i=0; i<list.length; i++)
  {
    if (list[i].name.toString().indexOf("Launchpad") != -1) {
        
    midiIn = list[i];
    midiIn.onmidimessage = midiProc;
      launchpadFound = true;
    }
  }
  
  // output
  list=midi.outputs();
  for (var i=0; i<list.length; i++)
  {
    if (list[i].name.toString().indexOf("Launchpad") != -1)
    {
      midiOut = list[i];
      break;
    }
  }
  
  if (midiOut && launchpadFound) 
  {       
    $("#message").text("Launchpad connected");
      
	midiOut.send( [0xB0,0x00,0x00] ); // Reset Launchpad
	midiOut.send( [0xB0,0x00,0x01] ); // Select XY mode
  }
}

function flipHandler(e) 
{
	hit( e.target );
}

var lastElem = null;

function setElemOnLaunchpad(elem)
{
    if (midiOut)
    {
        var key = elem.row*16 + elem.col;
        midiOut.send( [0x90, key, elem.classList.contains("live") ? 0x30 : (elem.classList.contains("mature")?0x13 : 0x00)]);
    } 
}

function hit(elem) 
{
    elem.className = "cell live";
    
    if (lastElem && lastElem != elem)
    {
        lastElem.className = "cell mature";
        setElemOnLaunchpad(lastElem);
    }
    lastElem = elem;
    
    playClip(elem.col, elem.row);
    setElemOnLaunchpad(elem);
}

function findElemByXY( x, y ) {
	var e, i, j, c;

	for (i in theUniverse.children) {
		e = theUniverse.children[i];
		if (e.row == y) {
			for (j in e.children) {
				if (e.children[j].col == x)
					return e.children[j];
			}
		}
	}
	return null;
}

function hitXY( x, y ) {
	var elem = findElemByXY( x, y );
	if (elem)
		hit( elem );
}

function midiProc(event) {
  data = event.data;
  var cmd = data[0] >> 4;
  var channel = data[0] & 0xf;
  var noteNumber = data[1];
  var velocity = data[2];

  if ( cmd==8 || ((cmd==9)&&(velocity==0)) ) { // with MIDI, note on with velocity zero is the same as note off
    // note off
    //noteOff(b);
  } else if (cmd == 9) {  // Note on
    if ((noteNumber&0x0f)==8)
      tick();
    else {
      var x = noteNumber & 0x0f;
      var y = (noteNumber & 0xf0) >> 4;
      hitXY( x, y );
    }
  } else if (cmd == 11) { // Continuous Controller message
    switch (b) {
    }
  }
}