(function($){

	$.audioRecorder = function(options){
		
		var settings = $.extend({
			bufferLen:4096,
			workerSrc:{
				wav:'js/audiorecorder_worker_wav.js',
				mp3:'js/audiorecorder_worker_mp3.js'
			},
			getFileName:null,
			onaccept:function(){},
			onerror:function(){},
			onstart:function(){},
			onstop:function(){},
			onencode:function(){},
			onsuccess:function(){}
			
		}, options );
	
		// Get cross browser audio context
		window.AudioContext = window.AudioContext || window.webkitAudioContext;

		this.uuid = 0;
		var audioContext = new AudioContext();
		var audioInput = null,
			realAudioInput = null,
			inputPoint = null,
			audioRecorder = null;
		var rafID = null;
		var analyserContext = null;
		
		var audioDownloads = [];
		
		var worker = new Worker( settings.workerSrc.wav );
		var mp3Worker = new Worker( settings.workerSrc.mp3 );
		
		this.init = init;
		function init(){
			
			// Browser targeting
			navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
			navigator.cancelAnimationFrame = navigator.cancelAnimationFrame || navigator.webkitCancelAnimationFrame || navigator.mozCancelAnimationFrame;
			navigator.requestAnimationFrame = navigator.requestAnimationFrame || navigator.webkitRequestAnimationFrame || navigator.mozRequestAnimationFrame;
			
			// Get access to user media
			navigator.getUserMedia({
				audio:true
			}, gotStream, function(e){
				settings.onerror(e);
				$(window).trigger('audiorecorder:error', [e]);
			});
			
		}
		
		function gotStream(stream){
			
			// Run accept event
			settings.onaccept(stream);
			$(window).trigger('audiorecorder:accept', [stream]);
			
			inputPoint = audioContext.createGain();

			// Create an AudioNode from the stream.
			realAudioInput = audioContext.createMediaStreamSource(stream);
			audioInput = realAudioInput;
			audioInput.connect(inputPoint);

			analyserNode = audioContext.createAnalyser();
			analyserNode.fftSize = 2048;
			inputPoint.connect( analyserNode );

			audioRecorder = new Recorder( inputPoint );

			zeroGain = audioContext.createGain();
			zeroGain.gain.value = 0.0;
			inputPoint.connect( zeroGain );
			zeroGain.connect( audioContext.destination );
			
		}
		
		this.Recorder = Recorder;
		function Recorder( source ){
			
			var uuid;
			
			var bufferLen = settings.bufferlen;
			
			var recording = false,
				currCallback;
			
			this.context = source.context;
			this.context.createJavaScriptNode = this.context.createJavaScriptNode || this.context.createScriptProcessor;
			
			this.node = this.context.createJavaScriptNode(bufferLen, 2, 2);
			
			worker.postMessage({
				command: 'init',
				config: {
					sampleRate: this.context.sampleRate
				},
				uuid:uuid
			});

			this.node.onaudioprocess = function(e){
				if(!recording) return;
				worker.postMessage({
					command: 'record',
					buffer: [ e.inputBuffer.getChannelData(0) ], //, e.inputBuffer.getChannelData(1) ]
					uuid:uuid
				});
			}
			
			this.configure = function(cfg){
				for (var prop in cfg){
					if (cfg.hasOwnProperty(prop)){
						config[prop] = cfg[prop];
					}
				}
			}
			
			this.setUuid = function(id){
				uuid = id;
			}

			this.record = function(){
				settings.onstart();
				$(window).trigger('audiorecorder:start');
				recording = true;
			}

			this.stop = function(){
				settings.onstop();
				$(window).trigger('audiorecorder:stop');
				recording = false;
			}
			
			this.cancel = function(){
				recording = false;
			}

			this.clear = function(){
				worker.postMessage({ command: 'clear', uuid:uuid });
			}

			this.getBuffers = function(cb){
				currCallback = cb;
				worker.postMessage({ command: 'getBuffers', uuid:uuid })
			}

			this.exportWAV = function(cb, type){
				currCallback = cb;
				type = type || 'audio/wav';
				worker.postMessage({
					command: 'exportWAV',
					type: type,
					uuid:uuid
				});
			}

			this.exportMonoWAV = function(uuid, cb, type){
				currCallback = cb;
				type = type || 'audio/wav';
				worker.postMessage({
					command: 'exportMonoWAV',
					type: type,
					uuid: uuid
				});
			}
			
			worker.onmessage = function(e){
				
				currCallback( e.data );
				
			}

			source.connect(this.node);
			this.node.connect(this.context.destination);
			
		}
		
		this.start = start;
		function start(){
			if(!audioRecorder) return;
			this.uuid++;
			audioRecorder.setUuid(this.uuid);
			audioRecorder.clear();
			audioRecorder.record();
		}
		
		this.cancel = cancel;
		function cancel(){
			audioRecorder.cancel();
		}
		
		this.stop = stop;
		function stop(){
			audioRecorder.stop();
			audioRecorder.getBuffers( gotBuffers );
		}
		
		function gotBuffers( data ){
			var buffers = data.buffers;
			audioRecorder.exportMonoWAV( this.uuid, doneEncoding );
		}

		function doneEncoding( data ){
			
			var uuid = data.uuid;
			var blob = data.blob;
			
			settings.onencode(uuid, blob);
			$(window).trigger('audiorecorder:encode', [uuid, blob]);
			
			var arrayBuffer;
			var fileReader = new FileReader();

			fileReader.onload = function(){
				arrayBuffer = this.result;
				var buffer = new Uint8Array(arrayBuffer),
				data = parseWav(buffer);

				mp3Worker.postMessage({ cmd: 'init', config:{
					mode : 3,
					channels:1,
					samplerate: data.sampleRate,
					bitrate: data.bitsPerSample
				}, uuid:uuid});

				mp3Worker.postMessage({ cmd: 'encode', buf: Uint8ArrayToFloat32Array(data.samples), uuid:uuid });
				mp3Worker.postMessage({ cmd: 'finish', uuid:uuid });
				mp3Worker.onmessage = function(e) {
					if (e.data.cmd == 'data') {

						var mp3Blob = new Blob([new Uint8Array(e.data.buf)], {type: 'audio/mp3'});
						var mp3base64 = encode64(e.data.buf);
						settings.onsuccess(e.data.uuid, mp3Blob, mp3base64);
						$(window).trigger('audiorecorder:success', [e.data.uuid, mp3Blob, mp3base64]);
						
					}
				}
			}

			fileReader.readAsArrayBuffer(blob);
			
		}
		
		this.saveAudio = saveAudio;
		function saveAudio(){
			audioRecorder.exportMonoWAV( doneEncoding );
		}
		
		this.encode64 = encode64;
		function encode64(buffer) {
			var binary = '',
				bytes = new Uint8Array( buffer ),
				len = bytes.byteLength;

			for (var i = 0; i < len; i++) {
				binary += String.fromCharCode( bytes[ i ] );
			}
			return window.btoa( binary );
		}

		this.parseWav = parseWav;
		function parseWav(wav) {
			function readInt(i, bytes) {
				var ret = 0,
					shft = 0;

				while (bytes) {
					ret += wav[i] << shft;
					shft += 8;
					i++;
					bytes--;
				}
				return ret;
			}
			return {
				sampleRate: readInt(24, 4),
				bitsPerSample: readInt(34, 2),
				samples: wav.subarray(44)
			};
		}

		function Uint8ArrayToFloat32Array(u8a){
			var f32Buffer = new Float32Array(u8a.length);
			for (var i = 0; i < u8a.length; i++) {
				var value = u8a[i<<1] + (u8a[(i<<1)+1]<<8);
				if (value >= 0x8000) value |= ~0x7FFF;
				f32Buffer[i] = value / 0x8000;
			}
			return f32Buffer;
		}
		
		return this;
		
	}

})( jQuery );