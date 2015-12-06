$(document).ready( function(){
	
	$('div.message-box').hide();
	var timers = [];
	
	function addMessage(type, val){
		var message = document.createElement('div');
		message.className = 'message message-' + type;
		
		var timestamp = document.createElement('div');
		timestamp.className = 'timestamp';
		timestamp.innerHTML = new Date().getTime();
		message.appendChild(timestamp);
		
		switch(type){
			case 'text':
				var content = document.createElement('div');
				content.className = 'content';
				content.innerHTML = val.message;
				message.appendChild(content);
			break;
			case 'audio':
				var content = document.createElement('div');
				content.className = 'content loading';
				content.setAttribute('id', 'uuid_' + val.uuid);
				content.setAttribute('data-uuid', val.uuid);
				content.setAttribute('data-duration', val.duration);
				
				var control = document.createElement('div');
				control.className = 'audio-control';
				
				var playtoggle = document.createElement('button');
				playtoggle.className = 'playtoggle icon-play_arrow';
				control.appendChild(playtoggle);
				
				var duration = document.createElement('div');
				duration.className = 'duration';
				var played = document.createElement('div');
				played.className = 'duration-played';
				duration.appendChild(played);
				control.appendChild(duration);
				
				var timer = document.createElement('span');
				timer.className = 'timer';
				timer.innerHTML = 'Loading...';
				control.appendChild(timer);
				content.appendChild(control);
				
				message.appendChild(content);
			break;
		}
		
		$('.messages').prepend(message);
	}
	
	function adjustTextareaHeight( obj ){
	}
	
	function saveAudio(uuid, blob, base64){
		var url = 'data:audio/mp3;base64,' + base64;
		var message_content = $('#uuid_' + uuid);
		
		var audio = document.createElement('audio');
		audio.setAttribute('volume', 1);
		
		var source = document.createElement('source');
		source.setAttribute('type','audio/mpeg');
		source.src = url;
		audio.appendChild(source);
		
		$(message_content).append(audio);
		timers[uuid] = message_content.find('.timer').timer();
		timers[uuid].set( $(message_content).attr('data-duration') );
	}

	var recorder = $.audioRecorder({
		onaccept:function(){
			$('button.send').hide();
			$('button.audio').attr('data-accepted',1).show();
		},
		onsuccess:saveAudio,
		onerror:function(e){
			console.log('error occured', e);
		}
	});
	
	$(window).on('audiorecorder:accept', function(stream){
		console.log('tigger got fired', stream);
	});
	
	console.log('before init');
	recorder.init();
	
	var timer = $('.message-box .timer').timer();
	
	$('button.audio').on('mousedown', function(){
		$(this).addClass('recording')
		$('div.message-box').show();
		$('textarea.message-box').hide();
		timer.start();
		recorder.start();
	}).on('mouseup', function(){
		$(this).removeClass('recording')
		$('div.message-box').hide();
		$('textarea.message-box').show();
		timer.stop();
		recorder.stop();
		addMessage('audio', {uuid:recorder.uuid, duration:timer.duration});
	});
	
	$('button.send').on('click', function(){
		if( $('textarea.message-box').val() > '' ){
			addMessage('text', {message:$('textarea.message-box').val()});
			$('textarea.message-box').val('')
			if( $('button.audio').attr('data-accepted') == 1 ){
				$('button.send').hide();
				$('button.audio').show();
			}
		}
	});
	
	$('.messages').on('click', '.audio-control button.playtoggle', function(){
		var playtoggle = $(this);
		var message = playtoggle.closest('.message');
		var content = message.find('.content');
		var uuid = content.attr('data-uuid');
		var audio = message.find('audio').get(0);
		var timer = message.find('.timer');
		var $timer = timers[uuid];
		
		console.log('click', $timer);
		
		if( !audio || !audio.play ){
			return;
		}
		
		if( playtoggle.hasClass('icon-play_arrow') ){
			if( !playtoggle.hasClass('started') ){
				$timer.set(0);
			}
			$timer.start();
			audio.play();
			playtoggle.removeClass('icon-play_arrow').addClass('icon-pause').addClass('started');
		} else {
			audio.pause();
			$timer.pause();
			playtoggle.addClass('icon-play_arrow').removeClass('icon-pause');
		}
		
		audio.addEventListener('ended', function(){
			playtoggle.addClass('icon-play_arrow').removeClass('icon-pause').removeClass('started');
			$timer.stop();
			$timer.set( content.attr('data-duration' ) );
		});
		
	});
	
	$('textarea.message-box').on('keyup', function(e){
		if( e.key == 'Enter' ){
			$('button.send').click();
		} else if( $(this).val() > '' && $('button.send').is(':hidden') ){
			$('button.send').show();
			$('button.audio').hide();
		} else if( $(this).val() == '' && $('button.audio').is(':hidden') && $('button.audio').attr('data-accepted') == 1 ){
			$('button.send').hide();
			$('button.audio').show();
		}
	}).on('keydown', function(e){
		adjustTextareaHeight( $(this) );
	});

});