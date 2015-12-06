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
				control.className = 'audio-control loading';
				
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
		$(obj).height(1);
		if( $(obj)[0].scrollHeight != $(obj).outerHeight(true) && $(obj)[0].scrollHeight > 50 ){
			$(obj).outerHeight( $(obj)[0].scrollHeight );
		} else {
			$(obj).outerHeight( 50 );
		}
	}
	
	function saveAudio(uuid, blob, base64){
		var url = 'data:audio/mp3;base64,' + base64;
		var message_content = $('#uuid_' + uuid);
		var duration_played = message_content.find('.duration .duration-played');
		
		var audio = document.createElement('audio');
		audio.setAttribute('volume', 1);
		
		audio.addEventListener('timeupdate', function(e){
			var percent = audio.currentTime / audio.duration * 100;
			duration_played.css({ 'width':percent + '%' });
		});
		
		var source = document.createElement('source');
		source.setAttribute('type','audio/mpeg');
		source.src = url;
		audio.appendChild(source);
		
		$(message_content).append(audio);
		timers[uuid] = message_content.find('.timer').timer();
		timers[uuid].set( $(message_content).attr('data-duration') );
		
		$(message_content).find('.loading').removeClass('loading');
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
	recorder.init();
	
	var timer = $('.message-box .timer').timer();	
	$('.new-message button.audio').on('mousedown', function(){
		$(this).addClass('recording')
		$('div.message-box').show();
		$('textarea.message-box').hide();
		timer.clear();
		timer.start();
		recorder.start();
	}).on('mouseup', function(){
		$(this).removeClass('recording')
		$('div.message-box').hide();
		$('textarea.message-box').show();
		timer.stop();
		recorder.stop();
		console.log('timer stopped', timer.duration);
		addMessage('audio', {uuid:recorder.uuid, duration:timer.duration});
	});
	
	$('.new-message button.send').on('click', function(){
		if( $('textarea.message-box').val() > '' ){
			addMessage('text', {message:$('textarea.message-box').val()});
			$('textarea.message-box').val('').outerHeight(50);
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
		var duration_played = content.find('.duration .duration-played');
		var $timer = timers[uuid];
		
		console.log('click', $timer);
		
		if( !audio || !audio.play ){
			return;
		}
		
		if( playtoggle.hasClass('icon-play_arrow') ){
			if( !playtoggle.hasClass('started') ){
				$timer.set(0);
				duration_played.width(0);
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
			duration_played.css({ 'width':'100%' });
		});
		
	});
	
	$('textarea.message-box').on('keyup', function(e){
		adjustTextareaHeight( $(this) );
		if( $(this).val() > '' && $('button.send').is(':hidden') ){
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