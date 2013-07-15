
    // These are the things you need:  an API key, the track ID, and the path to the track
    var apiKey = 'PGCZJJWKLITVGDF9Q';
    var trackID = 'TRCYWPQ139279B3308';
    var trackURL = 'audio/test.mp3';
    
    // Set up the key variables
    var remixer;
    var player;
    var track;

// The main function.
function init() 
{
    // Make sure the browser supports Web Audio.
    if (window.webkitAudioContext === undefined) 
    {
        $("#info").text("Web Audio is missing :(");
    } 
    else 
    {    
    
        // These set up the WebAudio playback environment, and create the remixer and player.
        var context = new webkitAudioContext();
        remixer = createJRemixer(context, $, apiKey);
        player = remixer.getPlayer();
        
         player.addAfterPlayCallback(playLoop);
    
        $("#info").text("Loading analysis data...");

        // The key line.  This prepares the track for remixing:  it gets
        // data from the Echo Nest analyze API and connects it with the audio file.
        // All the remixing takes place in the callback function.
        remixer.remixTrackById(trackID, trackURL, function(t, percent)
        {
            track = t;

            // Keep the user update with load times
            $("#info").text(percent + "% of the track loaded");
            if (percent == 100) {
                $("#info").text(percent + "% of the track loaded, remixing...");
                if (track.status != 'complete')
                {
                    $("#info").text("Something went wrong - status:" + track.status);
                }
            }
                
            // Do the remixing!
            if (track.status == 'ok') 
            {
                $("#info").text("Remix ready! " + track.analysis.beats.length + " beats, "  + track.analysis.tatums.length + " tatums");
            }
            
        });
    }
}

// Run the main function once the page is loaded.
window.onload = init;

//////////////////////////////////////////////////////////////
// looping "engine"

var nextLoopStart = 0;
var lastLoop = -1;
var beat = 3;

function playLoop()
{
    if (lastLoop < 0)
    {
        return;
    }
    
    console.log("loop: " + lastLoop + " beat: " + beat);
    
    // prevent queueing for each beat, as the callback comes on teh beat, not the bar
    if (++beat > 3)
    {
        beat = 0;
    }
    else
    {
        return;
    }
    
    var bar = new Array();
    bar.push(track.analysis.beats[lastLoop + 0]);
    bar.push(track.analysis.beats[lastLoop + 1]);
    bar.push(track.analysis.beats[lastLoop + 2]);
    bar.push(track.analysis.beats[lastLoop + 3]);
    
    
    nextLoopStart = player.play(nextLoopStart, bar);
}

function stopLooping()
{
        nextLoopStart = 0;
        player.stop();
        lastLoop = -1;
        beat = 3;
}

function playClip(x, y) 
{
    var yoff = y * 32;

    if (x < 4)
    {
        var xoff = x * 4;
        
        var start = false;
        if (lastLoop < 0)
        {
            player.stop();
            start = true;
        }
        lastLoop = yoff + xoff;    
        
        if (start)
            playLoop();
    }
    else
    {
        xoff = (x-4) * 4;
        
        var bar = new Array();
        for (var i=0; i < 16; ++i)
        {
            bar.push(track.analysis.tatums[yoff + xoff]);
        }
        
        stopLooping();
        player.play(0, bar);
    }
}

function playOriginal()
{
    stopLooping();
    player.play(0, track.analysis.beats)
}