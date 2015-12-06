(function($){

	$.fn.timer = function(options){
		
		var timer_obj = this;
		
		var starttime,
			endtime,
			timertimeout,
			timerinterval;
		
		var output,
			output_sec,
			output_min;
			
		this.duration = 0;
			
		set(0);
	
		this.start = start;
		function start(){
			if( !starttime ){
				starttime = new Date().getTime();
				set(0);
				output_sec = 0;
				output_min = 0;
				timerinterval = setInterval( function(){
					increase();
				}, 1000);
			} else {
				var diff = this.duration;
				while( diff > 1 ){
					diff--;
				}
				diff = (1 - diff) * 1000;
				timertimeout = setTimeout(function(){
					increase();
					timerinterval = setInterval( function(){
						increase();
					}, 1000);
				}, diff);
			}			
			
			function increase(){
				output_sec++;
				if( output_sec >= 60 ){
					output_min++;
					output_sec = 0;
				}
				output = ('00' + output_min).substr(-2) + ':' + ('00' + output_sec).substr(-2);
				timer_obj.text(output);
			}
		}
		
		this.stop = stop;
		function stop(){
			endtime = new Date().getTime();
			this.duration = ( endtime - starttime ) / 1000;
			clearTimeout(timertimeout);
			clearInterval(timerinterval);
			clear();
		}
		
		this.pause = pause
		function pause(){
			endtime = new Date().getTime();
			clearTimeout(timertimeout);
			clearInterval(timerinterval);
			this.duration = ( endtime - starttime ) / 1000;
		}
		
		this.clear = clear
		function clear(){
			starttime = null;
			endtime = null;
			output = '';
			output_sec = 0;
			output_min = 0;
		}
		
		this.set = set;
		function set( seconds ){
			clear();
			this.duration = seconds;
			endtime =  new Date().getTime();
			starttime = endtime - ( seconds *  1000 );
			output_sec = Math.floor( parseFloat(seconds) );
			output_min = 0;
			while( output_sec > 60 ){
				output_sec -= 60;
				output_min++;
			}
			output = ('00' + output_min).substr(-2) + ':' + ('00' + output_sec).substr(-2);
			timer_obj.text(output);
		}
		
		return this;
	
	}
	
})( jQuery );