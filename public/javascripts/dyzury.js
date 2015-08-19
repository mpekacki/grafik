$(document).ready(function(){
	$('select#osoby').change(function(){
		ajaxDyzuryOsoby($('select#osoby').val());
	});

	ajaxDyzuryOsoby($('select#osoby').val());
});

function ajaxDyzuryOsoby(login){
	$.get("/api/dyzury/" + login, function(data){
		$('select#role').val(data.rola);

		$('input#poniedzialek').prop('checked', data.poniedzialek);
		$('input#wtorek').prop('checked', data.wtorek);
		$('input#sroda').prop('checked', data.sroda);
		$('input#czwartek').prop('checked', data.czwartek);
		$('input#piatek').prop('checked', data.piatek);
		$('input#sobota').prop('checked', data.sobota);
		$('input#niedziela').prop('checked', data.niedziela);
	});
}