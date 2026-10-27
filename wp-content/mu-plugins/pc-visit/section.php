<?php defined( 'ABSPATH' ) || exit; ?>
<section class="pc-visit indv-section space-pd-top" id="pc-visit" aria-labelledby="pc-visit-title" data-pc-view="section">
	<div class="container">
		<h3 class="top-title text-center" id="pc-visit-title">Visit Primus Olympia</h3>
		<p class="sub-lead sub_heading text-center"><b>Get Free Complimentary Doorstep Chauffeur Pickup &amp; Drop.</b></p>

		<div class="pc-visit__grid">
			<div class="pc-visit__info">
				<p class="pc-text">Travel stress-free.</p>
				<ol class="pc-steps">
					<li><span class="pc-steps__num" aria-hidden="true">1</span><span><b>Tell us when and where.</b> Share your preferred date and pickup area.</span></li>
					<li><span class="pc-steps__num" aria-hidden="true">2</span><span><b>Our team confirms by call.</b> We check the location and schedule with you.</span></li>
					<li><span class="pc-steps__num" aria-hidden="true">3</span><span><b>Visit Primus Olympia.</b> See the 2 BHK homes inside the Gopalan Olympia township.</span></li>
				</ol>
				<p class="pc-disclaimer">Chauffeur service across Bangalore is subject to location, schedule, and team confirmation.</p>
			</div>

			<div class="pc-visit__slot" id="pc-slot">
				<div class="pc-card" id="pc-booking">
					<form class="pc-form" id="pc-visit-form" novalidate>
						<div class="pc-step" data-pc-step="1">
							<h4 class="pc-step__title" tabindex="-1">Step 1 of 2: Your details</h4>

							<div class="pc-field">
								<label for="pc-name">Your name (required)</label>
								<input id="pc-name" name="name" type="text" autocomplete="name" maxlength="80" required aria-describedby="pc-name-err">
								<p class="pc-error" id="pc-name-err" hidden></p>
							</div>

							<div class="pc-field">
								<label for="pc-phone">Mobile number (required)</label>
								<p class="pc-hint" id="pc-phone-hint">10-digit Indian mobile number. +91 is optional.</p>
								<input id="pc-phone" name="phone" type="tel" autocomplete="tel" maxlength="16" required aria-describedby="pc-phone-hint pc-phone-err">
								<p class="pc-error" id="pc-phone-err" hidden></p>
							</div>

							<p class="pc-note">We use your name and number only to arrange this visit and call you about it. <a href="/privacy-policy/">Privacy Policy</a></p>

							<label class="pc-check">
								<input type="checkbox" name="consent" value="yes">
								<span>Yes, Primus may also send me updates about its homes by WhatsApp, SMS, email and phone. I can opt out at any time. (Optional)</span>
							</label>

							<div class="pc-hp" aria-hidden="true">
								<label for="pc-website">Website</label>
								<input id="pc-website" name="website" type="text" tabindex="-1" autocomplete="off">
							</div>

							<button type="submit" class="pc-btn pc-btn--block">Continue</button>
						</div>

						<div class="pc-step" data-pc-step="2" hidden>
							<h4 class="pc-step__title" tabindex="-1">Step 2 of 2: Your visit</h4>
							<p class="pc-text">Thank you. These details help us plan your visit. Only the fields marked required are needed.</p>

							<div class="pc-field">
								<label for="pc-area">Pickup area or pincode (required)</label>
								<input id="pc-area" name="pickup_area" type="text" maxlength="120" required aria-describedby="pc-area-err pc-area-status">
								<p class="pc-error" id="pc-area-err" hidden></p>
								<p class="pc-status" id="pc-area-status" role="status"></p>
							</div>

							<div class="pc-field">
								<label for="pc-date">Preferred date (required)</label>
								<input id="pc-date" name="visit_date" type="date" required aria-describedby="pc-date-err">
								<p class="pc-error" id="pc-date-err" hidden></p>
							</div>

							<div class="pc-field">
								<label for="pc-slot-time">Preferred time</label>
								<select id="pc-slot-time" name="slot">
									<option value="">No preference</option>
									<option value="morning">Morning (10 am to 12 noon)</option>
									<option value="midday">Afternoon (12 noon to 3 pm)</option>
									<option value="evening">Late afternoon (3 pm to 6 pm)</option>
								</select>
							</div>

							<fieldset class="pc-field">
								<legend>Who is the visit for?</legend>
								<div class="pc-choices">
									<label class="pc-choice"><input type="radio" name="visit_for" value="self"><span>Myself</span></label>
									<label class="pc-choice"><input type="radio" name="visit_for" value="parent"><span>My parent(s)</span></label>
									<label class="pc-choice"><input type="radio" name="visit_for" value="other"><span>Someone else</span></label>
								</div>
							</fieldset>

							<div class="pc-field">
								<label for="pc-people">Number of people visiting</label>
								<select id="pc-people" name="people">
									<option value="">Not sure yet</option>
									<option value="1">1</option>
									<option value="2">2</option>
									<option value="3">3</option>
									<option value="4">4</option>
									<option value="5">5 or more</option>
								</select>
							</div>

							<fieldset class="pc-field">
								<legend>When are you planning to buy?</legend>
								<div class="pc-choices">
									<label class="pc-choice"><input type="radio" name="timeline" value="now"><span>Ready now</span></label>
									<label class="pc-choice"><input type="radio" name="timeline" value="1-3m"><span>In 1 to 3 months</span></label>
									<label class="pc-choice"><input type="radio" name="timeline" value="exploring"><span>Just exploring</span></label>
								</div>
							</fieldset>

							<fieldset class="pc-field">
								<legend>Budget</legend>
								<div class="pc-choices">
									<label class="pc-choice"><input type="radio" name="budget" value="98l-plus"><span>₹98 L or above</span></label>
									<label class="pc-choice"><input type="radio" name="budget" value="below-98l"><span>Below ₹98 L</span></label>
									<label class="pc-choice"><input type="radio" name="budget" value="unsure"><span>Not sure yet</span></label>
								</div>
							</fieldset>

							<div class="pc-field">
								<label for="pc-comfort">Anything we should prepare for the senior's comfort?</label>
								<p class="pc-hint" id="pc-comfort-hint">For example, a wheelchair or help with steps. Please do not share medical details.</p>
								<textarea id="pc-comfort" name="comfort" rows="3" maxlength="500" aria-describedby="pc-comfort-hint"></textarea>
							</div>

							<button type="submit" class="pc-btn pc-btn--block">Request my visit</button>
						</div>

						<p class="pc-formerror" role="alert" hidden></p>

						<input type="hidden" name="utm_source">
						<input type="hidden" name="utm_medium">
						<input type="hidden" name="utm_campaign">
						<input type="hidden" name="utm_term">
						<input type="hidden" name="utm_content">
						<input type="hidden" name="page_url">
						<input type="hidden" name="device">
						<input type="hidden" name="client_ts">
						<input type="hidden" name="offer_id" value="olympia-chauffeur-v1">
					</form>

					<div class="pc-success" hidden>
						<h4 class="pc-step__title" tabindex="-1">Request received</h4>
						<p class="pc-text">Thank you, <span data-pc-out="name"></span>. Our team will call you on <span data-pc-out="phone"></span> to confirm your visit and whether pickup can be arranged from your area.</p>
						<ol class="pc-steps pc-steps--compact">
							<li><span class="pc-steps__num" aria-hidden="true">1</span><span>Keep your phone nearby. We call within working hours.</span></li>
							<li><span class="pc-steps__num" aria-hidden="true">2</span><span>We confirm the date, time and pickup with you.</span></li>
						</ol>
						<p class="pc-disclaimer">Chauffeur service across Bangalore is subject to location, schedule, and team confirmation.</p>
						<p class="pc-text">Your reference: <b data-pc-out="ref"></b></p>
						<a class="pc-btn pc-btn--block" data-pc-wa href="https://api.whatsapp.com/send?phone=919845037078" target="_blank" rel="noopener">Send these details on WhatsApp<span class="pc-sr"> (opens in a new tab)</span></a>
					</div>
				</div>
			</div>
		</div>
	</div>

	<dialog class="pc-dialog" id="pc-dialog" aria-labelledby="pc-dialog-title">
		<div class="pc-dialog__inner">
			<div class="pc-dialog__head">
				<h2 class="pc-dialog__title" id="pc-dialog-title">Book a site visit</h2>
				<button type="button" class="pc-dialog__close" data-pc-close aria-label="Close">&times;</button>
			</div>
			<p class="pc-text"><b>Get Free Complimentary Doorstep Chauffeur Pickup &amp; Drop.</b> Travel stress-free.</p>
			<p class="pc-disclaimer">Chauffeur service across Bangalore is subject to location, schedule, and team confirmation.</p>
			<div class="pc-dialog__body"></div>
		</div>
	</dialog>
</section>
