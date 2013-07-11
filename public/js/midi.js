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
            
            cellElem.xval = j;
            cellElem.yval = i;

			rowElem.appendChild(cellElem);
		}
		theUniverse.appendChild(rowElem);
	}
	navigator.requestMIDIAccess().then( onMIDIInit );
} );

var selectMIDIIn = null;
var selectMIDIOut = null;
var midiAccess = null;
var midiIn = null;
var midiOut = null;
var launchpadFound = false;

function changeMIDIIn( ev ) {
  var list=midiAccess.inputs();
  var selectedIndex = ev.target.selectedIndex;

  if (list.length >= selectedIndex) {
    midiIn = list[selectedIndex];
    midiIn.onmidimessage = midiMessageReceived;
  }
}

function changeMIDIOut( ev ) {
  var list=midiAccess.outputs();
  var selectedIndex = ev.target.selectedIndex;

  if (list.length >= selectedIndex) {
    midiOut = list[selectedIndex];
	midiOut.send( [0xB0,0x00,0x00] ); // Reset Launchpad
	midiOut.send( [0xB0,0x00,0x01] ); // Select XY mode
	drawFullBoardToMIDI();
  }
}

function onMIDIInit( midi ) {
  var preferredIndex = 0;
  midiAccess = midi;
  selectMIDIIn=document.getElementById("midiIn");
  selectMIDIOut=document.getElementById("midiOut");

  var list=midiAccess.inputs();

  // clear the MIDI input select
  selectMIDIIn.options.length = 0;

  for (var i=0; i<list.length; i++)
    if (list[i].name.toString().indexOf("Launchpad") != -1) {
      preferredIndex = i;
      launchpadFound = true;
    }

  if (list.length) {
    for (var i=0; i<list.length; i++)
      selectMIDIIn.options[i]=new Option(list[i].name,list[i].fingerprint,i==preferredIndex,i==preferredIndex);

    midiIn = list[preferredIndex];
    midiIn.onmidimessage = midiProc;

    selectMIDIIn.onchange = changeMIDIIn;
  }

  // clear the MIDI output select
  selectMIDIOut.options.length = 0;
  preferredIndex = 0;
  list=midi.outputs();

  for (var i=0; i<list.length; i++)
    if (list[i].name.toString().indexOf("Launchpad") != -1)
      preferredIndex = i;

  if (list.length) {
    for (var i=0; i<list.length; i++)
      selectMIDIOut.options[i]=new Option(list[i].name,list[i].fingerprint,i==preferredIndex,i==preferredIndex);

    midiOut = list[preferredIndex];
    selectMIDIOut.onchange = changeMIDIOut;
  }

  if (midiOut && launchpadFound) {  
	midiOut.send( [0xB0,0x00,0x00] ); // Reset Launchpad
	midiOut.send( [0xB0,0x00,0x01] ); // Select XY mode
	drawFullBoardToMIDI();
  }
}

function drawFullBoardToMIDI() {
    for (var i=0; i<numRows; i++) {
		for (var j=0; j<numCols; j++) {
			var key = i*16 + j;
			midiOut.send( [0x90, key, findElemByXY(j,i).classList.contains("mature")?0x13:0x30]);
		}	
	}
}

function flipHandler(e) 
{
	hit( e.target );
}

var lastElem = null;

function hit(elem) 
{
    elem.className = "cell live";
    
    if (lastElem && lastElem != elem)
    {
        lastElem.className = "cell mature";
    }
    lastElem = elem;
    
    playClip(elem.xval, elem.yval);
    
    if (midiOut)
    {
        var key = elem.row*16 + elem.col;
    	midiOut.send( [0x90, key, elem.classList.contains("live") ? (elem.classList.contains("mature")?0x13:0x30) : 0x00]);
    }
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