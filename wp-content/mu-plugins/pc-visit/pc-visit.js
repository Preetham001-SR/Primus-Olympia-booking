/* Primus chauffeur site visit: 2-step lead form, modal, analytics. Vanilla JS, no dependencies. */
(function () {
	'use strict';
	var form = document.getElementById('pc-visit-form');
	if (!form) return;

	var cfg = window.pcVisit || {};
	var OFFER = 'olympia-chauffeur-v1';
	var card = document.getElementById('pc-booking');
	var slot = document.getElementById('pc-slot');
	var dialog = document.getElementById('pc-dialog');
	var dialogBody = dialog && dialog.querySelector('.pc-dialog__body');
	var success = card.querySelector('.pc-success');
	var formError = form.querySelector('.pc-formerror');
	var area = form.elements.pickup_area;
	var areaStatus = document.getElementById('pc-area-status');
	var pincodeRe = new RegExp(cfg.pincodeRe || '^560\\d{3}$');
	var lead = null; // { ref, token } once step 1 is saved
	var opener = null;

	function track(event, params) {
		(window.dataLayer = window.dataLayer || []).push(Object.assign({ event: event, offer_id: OFFER }, params || {}));
	}

	// Theme main.js binds jQuery Validate + its own AJAX submit to every <form>. Detach it from ours.
	if (window.jQuery) jQuery(function ($) { setTimeout(function () { $(form).off('.validate').removeData('validator'); }); });

	/* Hidden fields */
	var UTM = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
	var qs = new URLSearchParams(location.search);
	var utm = {};
	try { utm = JSON.parse(sessionStorage.getItem('pc_utm')) || {}; } catch (e) {}
	if (UTM.some(function (k) { return qs.get(k); })) {
		utm = {};
		UTM.forEach(function (k) { if (qs.get(k)) utm[k] = qs.get(k); });
		try { sessionStorage.setItem('pc_utm', JSON.stringify(utm)); } catch (e) {}
	}
	UTM.forEach(function (k) { form.elements[k].value = utm[k] || ''; });
	form.elements.page_url.value = location.href.split('#')[0];
	form.elements.device.value = innerWidth < 768 ? 'mobile' : innerWidth < 1024 ? 'tablet' : 'desktop';

	/* Dates: tomorrow to 90 days out, in the visitor's local time */
	function iso(d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
	var day = 864e5, now = new Date();
	var minDate = iso(new Date(now.getTime() + day)), maxDate = iso(new Date(now.getTime() + 90 * day));
	form.elements.visit_date.min = minDate;
	form.elements.visit_date.max = maxDate;

	/* Validation */
	function normPhone(v) {
		var d = v.replace(/[\s\-().]/g, '').replace(/^(\+?91|0)(?=\d{10}$)/, '');
		return /^[6-9]\d{9}$/.test(d) ? d : null;
	}
	var rules = {
		1: [
			['name', function (v) { return v.trim().length >= 2; }, 'Please enter your name.'],
			['phone', normPhone, 'Please enter a 10-digit Indian mobile number, for example 98765 43210.']
		],
		2: [
			['pickup_area', function (v) { return v.trim().length >= 2; }, 'Please enter your pickup area or pincode.'],
			['visit_date', function (v) { return v >= minDate && v <= maxDate; }, 'Please choose a date between tomorrow and the next 3 months.']
		]
	};
	function setError(input, msg) {
		var err = document.getElementById(input.id + '-err');
		input.setAttribute('aria-invalid', msg ? 'true' : 'false');
		err.textContent = msg || '';
		err.hidden = !msg;
	}
	function validate(step) {
		var first = null;
		rules[step].forEach(function (r) {
			var input = form.elements[r[0]], ok = !!r[1](input.value);
			setError(input, ok ? '' : r[2]);
			if (!ok && !first) first = input;
		});
		if (first) first.focus();
		return !first;
	}
	form.addEventListener('input', function (e) {
		if (e.target.getAttribute('aria-invalid') === 'true') setError(e.target, '');
	});

	/* Serviceability hint: never a confirmation */
	function checkArea(final) {
		var m = area.value.match(/\b\d{6}\b/);
		if (m) areaStatus.textContent = pincodeRe.test(m[0])
			? 'Looks like we can arrange this. Our team will confirm.'
			: 'Our team will check whether pickup is possible from this pincode and confirm by call.';
		else areaStatus.textContent = final && area.value.trim().length >= 2
			? 'Our team will check pickup from this area and confirm by call.' : '';
	}
	area.addEventListener('input', function () { checkArea(false); });
	area.addEventListener('change', function () { checkArea(true); });

	/* Steps */
	function show(el) {
		form.querySelectorAll('.pc-step').forEach(function (s) { s.hidden = s !== el; });
		var title = el.querySelector('.pc-step__title') || el;
		title.focus({ preventScroll: true });
		title.scrollIntoView({ block: 'nearest', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
	}
	function busy(on) {
		form.querySelectorAll('button[type=submit]').forEach(function (b) { b.disabled = on; });
		form.setAttribute('aria-busy', on ? 'true' : 'false');
	}
	function fail(msg) {
		formError.textContent = msg || 'Sorry, we could not send this. Please try again, or call us on 1800 121 411111.';
		formError.hidden = false;
	}

	form.addEventListener('submit', function (e) {
		e.preventDefault();
		var step = lead ? 2 : 1;
		formError.hidden = true;
		if (!validate(step)) return;
		track(step === 1 ? 'step1_complete' : 'step2_complete');

		form.elements.client_ts.value = new Date().toISOString();
		var fd = new FormData(form);
		fd.set('phone', normPhone(form.elements.phone.value) || '');
		fd.append('action', 'pc_visit');
		fd.append('stage', step);
		fd.append('nonce', cfg.nonce || '');
		if (lead) { fd.append('ref', lead.ref); fd.append('token', lead.token); }

		busy(true);
		fetch(cfg.ajaxUrl || '/wp-admin/admin-ajax.php', { method: 'POST', body: fd, credentials: 'same-origin' })
			.then(function (r) { return r.json(); })
			.then(function (res) {
				busy(false);
				var data = res && res.data || {};
				if (!res || !res.success) {
					var input = data.field && form.elements[data.field];
					if (input && input.id) { setError(input, data.message); input.focus(); } else fail(data.message);
					return;
				}
				if (step === 1) {
					lead = { ref: data.ref, token: data.token };
					show(form.querySelector('[data-pc-step="2"]'));
				} else {
					done(data);
				}
			})
			.catch(function () { busy(false); fail(); });
	});

	function selectedText(name) {
		var el = form.elements[name];
		return el.selectedIndex > 0 ? el.options[el.selectedIndex].text : '';
	}
	function done(data) {
		var phone = normPhone(form.elements.phone.value);
		var date = new Date(form.elements.visit_date.value + 'T00:00:00')
			.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
		var time = selectedText('slot');
		card.querySelector('[data-pc-out=name]').textContent = form.elements.name.value.trim();
		card.querySelector('[data-pc-out=phone]').textContent = phone.slice(0, 5) + ' ' + phone.slice(5);
		card.querySelector('[data-pc-out=ref]').textContent = data.ref;
		var text = 'Hi, I would like to visit Primus Olympia on ' + date + (time ? ', ' + time : '') +
			'. Pickup area: ' + area.value.trim() + '. Reference: ' + data.ref + '.';
		card.querySelector('[data-pc-wa]').href = 'https://api.whatsapp.com/send?phone=' + (cfg.whatsapp || '919845037078') +
			'&text=' + encodeURIComponent(text);
		form.hidden = true;
		success.hidden = false;
		show(success);
		track('submit_success', { lead_band: data.band });
	}
	card.querySelector('[data-pc-wa]').addEventListener('click', function () { track('whatsapp_click'); });

	/* Modal: the same booking card moves into the dialog, so state carries over */
	function open(placement) {
		track('offer_cta_click', { placement: placement });
		if (!dialog || !dialog.showModal) {
			card.scrollIntoView();
			return form.elements.name.focus();
		}
		opener = document.activeElement;
		dialogBody.appendChild(card);
		document.documentElement.classList.add('pc-lock');
		dialog.showModal();
		var first = success.hidden ? form.querySelector('.pc-step:not([hidden]) input:not([type=hidden])') : success.querySelector('.pc-step__title');
		if (first) first.focus();
	}
	if (dialog) {
		dialog.addEventListener('close', function () {
			slot.appendChild(card);
			document.documentElement.classList.remove('pc-lock');
			if (opener && opener.focus) opener.focus();
		});
		dialog.addEventListener('click', function (e) {
			if (e.target === dialog || e.target.closest('[data-pc-close]')) dialog.close();
		});
	}
	// Capture phase so the theme's smooth-scroll handler on a[href*="#"] never sees these clicks.
	document.addEventListener('click', function (e) {
		var t = e.target.closest && e.target.closest('[data-pc-open]');
		if (!t) return;
		e.preventDefault();
		e.stopPropagation();
		open(t.getAttribute('data-pc-open'));
	}, true);

	/* Header ENQUIRY dropdowns (desktop + mobile) get a "Site visit" entry */
	var desk = document.getElementById('dropdown');
	if (desk) desk.insertAdjacentHTML('beforeend', '<a class="dropdown-item" href="#pc-visit" data-pc-open="header_menu">SITE VISIT</a>');
	var mob = document.querySelector('.pm-enquiry-dropdown');
	if (mob) mob.insertAdjacentHTML('beforeend', '<li><a href="#pc-visit" data-pc-open="header_menu_mobile">SITE VISIT</a></li>');

	/* offer_view: once per placement, when its top reaches the upper 60% of the viewport */
	if ('IntersectionObserver' in window) {
		var io = new IntersectionObserver(function (entries) {
			entries.forEach(function (en) {
				if (!en.isIntersecting) return;
				track('offer_view', { placement: en.target.getAttribute('data-pc-view') });
				io.unobserve(en.target);
			});
		}, { rootMargin: '0px 0px -40% 0px' });
		document.querySelectorAll('[data-pc-view]').forEach(function (el) { io.observe(el); });
	}
})();
