
// These are the things you need:  an API key, the track ID, and the path to the track
var apiKey = 'PGCZJJWKLITVGDF9Q';
var trackID;
var trackURL;

// Set up the key variables
var remixer;
var player;
var track;


// Get an estimation of analysis time
function fetchQinfo() {
    var url = 'http://remix.echonest.com/Uploader/qinfo?callback=?'
    $.getJSON(url, {}, function(data) {
        $("#info").text("Estimated analysis time: " + Math.floor(data.estimated_wait * 1.2) + " seconds.");
    });
}

// Get the analysis, if it is ready
function analyzeAudio(audio, tag, callback) {
    var url = 'http://remix.echonest.com/Uploader/qanalyze?callback=?'
    $.getJSON(url, { url:audio, api_key:apiKey, tag:tag}, function(data) {
        if (data.status === 'done' || data.status === 'error') {
            callback(data);
        } else {
            $("#info").text(data.status + ' - ready in about ' + data.estimated_wait + ' secs. ');
            setTimeout(function() { analyzeAudio(audio, tag, callback); }, 8000);
        } 
    });
}

function init() {
    if (window.webkitAudioContext === undefined) {
        error("Sorry, this app needs advanced web audio. Your browser doesn't"
            + " support it. Try the latest version of Chrome");
    }
    // Read the URL query string to decide what to do
    var params = {};
    var q = document.URL.split('?')[1];
    if(q != undefined){
        q = q.split('&');
        for(var i = 0; i < q.length; i++){
            var pv = q[i].split('=');
            var p = pv[0];
            var v = pv[1];
            params[p] = v;
        }
    }

    if ('key' in params) {
        // We just uploaded a track.
        // We need to log the trackID and the URL, and then redirect.
        $("#select-track").hide();
        $("#play-remix").hide();
        $("#info").text("Analyzing audio...");
        trackURL = 'http://' + params['bucket'] + '/' + urldecode(params['key']);

        analyzeAudio(trackURL, 'tag', function(data) {
            if (data.status === 'done') {
                var newUrl = location.protocol + "//" +  location.host + location.pathname + "?trid=" + data.trid;
                location.href = newUrl;
            }
        });
    } 

    else if ('trid' in params) {
        // We were passed a trackID directly in the url
        // We can remix the track we get back!
        trackID = params['trid'];
        $("#play-remix").show();
        $("#select-track").hide();

        var urlXHR = getProfile(trackID, function(data) {
            trackURL = data.url;

            if (data.status == true) {
                console.log("Ready to remix");
                var context = new webkitAudioContext();
                // Only use the filesystem if we have access to it.
                if (window.File && window.FileReader && window.FileList && window.Blob && window.webkitRequestFileSystem) {
                    window.requestFileSystem  = window.requestFileSystem || window.webkitRequestFileSystem;
                    window.requestFileSystem(window.TEMPORARY, 1024*1024, function(filesystem) {
                        fs = filesystem;
                    }, fileErrorHandler);
                }

                remixer = createJRemixer(context, $, apiKey);
                player = remixer.getPlayer();

                loadRemixData();
            }
            else {
                console.log("Track id error.");
                $("#play-remix").hide();
                $("#select-track").show();
                $("#info").text("Error getting the track URL - please try again, or re-upload the file.");
                $("#redirect-url").attr('value', document.URL);

                $("#file").change( 
                    function() {
                        fetchQinfo();
                        var filename = $("#file").val();
                        if (endsWith(filename.toLowerCase(), ".mp3")) {
                            $("#f-filename").attr('value', fixFileName(filename));
                            $("#upload").removeAttr('disabled');
                        } else {
                            alert('Sorry, this app only supports MP3s');
                            $("#upload").attr('disabled', 'disabled');
                        }
                    }
                );
                fetchSignature();
            }
        });
    } else {
        // We're waiting for the user to pick a track and upload it
        $("#play-remix").hide();
        $("#redirect-url").attr('value', document.URL);

        $("#file").change( 
            function() {
                var filename = $("#file").val();
                if (endsWith(filename.toLowerCase(), ".mp3")) {
                    $("#f-filename").attr('value', fixFileName(filename));
                    $("#upload").removeAttr('disabled');
                } else {
                    alert('Sorry, this app only supports MP3s');
                    $("#upload").attr('disabled', 'disabled');
                }
            }
        );
        
        fetchSignature();
        fetchQinfo();
    }
}

function loadRemixData()
{
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
            $("#info").text(percent + "% of the track loaded, building...");
            if (track.status != 'complete')
            {
                $("#info").text("Something went wrong - status:" + track.status);
            }
        }
            
        // Do the remixing!
        if (track.status == 'ok') 
        {
            $("#info").text("Ready.");
                           
            prepareDropboxUpload();
        }
    });
}


var URLs = new Array();
var expectedCount = 0;

function uploadComplete(evt) 
{
    var URL = this.responseXML.getElementsByTagName("Location")[0].childNodes[0].nodeValue;
    var filename = URL.substr(URL.indexOf("---") + 3);
    
    if (URLs.push({'url':URL, 'filename':filename}) == expectedCount)
    {
        // we have all the loops uploaded - create Dropbox URLs and button
        var options = {
        files: URLs,
        success: function() {},
        progress: function(progress) {},
        cancel: function() {},
        error: function(errmsg) {}
        }
        
        var btn = Dropbox.createSaveButton(options);
        document.getElementById('dropbox-upload').appendChild(btn);
    }
}


function uploadBlobToS3(blob, filename)
{
    var fd = new FormData();
    
    var key = "loop" + (new Date).getTime() + '---' + filename;
    
    fd.append('key', key);
    fd.append('Content-Type', "audio");
    fd.append('success_action_status', "201");
    //fd.append('AWSAccessKeyId', 'YOUR ACCESS KEY');
    //fd.append('policy', 'YOUR POLICY')
    //fd.append('signature','YOUR SIGNATURE');  
    fd.append("filename", filename); 
    fd.append("file",  blob);
    var xhr = new XMLHttpRequest();

    xhr.addEventListener("load", uploadComplete, false);
    
    xhr.open('POST', 'https://demixr.s3.amazonaws.com/', true); 
    
    xhr.send(fd);
}


function prepareDropboxUpload()
{
    var loops = 32;
    
    expectedCount = loops;
    
    for (var i=0; i<loops; i++)
    {
        // build a bit of audio data
        var loop = new Array();
        loop.push(track.analysis.bars[0 +i*2]);
        loop.push(track.analysis.bars[1+ i*2]);
        
        // create a wav blob
        var blob = new Blob([Wav.createWaveFileData(loop)], {type: 'binary'});
        
        uploadBlobToS3(blob, "loop" + (i+1) + ".wav");
    }
}

// Run the main function once the page is loaded.
window.onload = init;

//////////////////////////////////////////////////////////////
// looping "engine"
var colOffset = 4; // default is not to skip bars to fit more content in for long songs
var nextLoopStart = 0;
var lastLoop = -1;
var beat = 3;

function playLoop()
{
    if (lastLoop < 0)
    {
        return;
    }
    
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
    var yoff = y * colOffset * 8;

    var xoff = x * colOffset;
    
    var nextLoop = xoff + yoff;
    
    var start = false;
    if (lastLoop < 0 || lastLoop == nextLoop) 
    {
       stopLooping();
        start = true;
    }
    lastLoop = nextLoop;    
    
    if (start)
        playLoop();

}

function playOriginal()
{
    stopLooping();
    player.play(0, track.analysis.sections)
}