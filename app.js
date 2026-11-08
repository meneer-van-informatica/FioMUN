(async () => {
  'use strict';

  // FioMUN public information pages. Registration uses external Google Forms.
  let data;
  try {
    const response = await fetch('./data/site-data.json', {cache: 'no-store'});
    if (!response.ok) throw new Error('Content file not available');
    data = await response.json();
    if (!data || !data.meta || !data.pages || !Array.isArray(data.menu) ||
        data.menu.length === 0 || Object.keys(data.pages).length === 0 ||
        !data.registration || data.registration.mode !== 'closed') {
      throw new Error('Website content is not ready for publication');
    }
  } catch (error) {
    document.body.classList.add('site-unavailable');
    const notice = document.querySelector('#siteNotice');
    notice.textContent = 'FioMUN 2027: this website is being prepared. Please check back soon.';
    notice.hidden = false;
    return;
  }
  const pagesData = data.pages || {};
  const menuItems = (Array.isArray(data.menu) ? data.menu : []).filter((item) => ['home','about','committees','registrations','contact'].includes(item.route));
  if (!menuItems.some((item) => item.route === 'committees')) menuItems.splice(Math.min(2,menuItems.length),0,{route:'committees',label:'Committees & Topics'});
  const validRoutes = new Set(menuItems.map((item) => item.route));
  validRoutes.add('home');

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  function getPath(object, path, fallback = '') {
    const value = String(path || '').split('.').reduce((current, key) => {
      if (current == null || typeof current !== 'object') return undefined;
      return current[key];
    }, object);
    return value == null ? fallback : value;
  }

  // Published FioMUN 2027 registration links. Sheet values take precedence when present.
  // Keep these fallbacks until the same URLs have been entered in FioMUN Content > 00_CONFIG.
  function registrationForms() {
    const configured = getPath(data, 'registration.forms', {});
    return {
      staff: configured.staff || 'https://forms.gle/8aVeNfXji4sFVyvE6',
      individual: configured.individual || 'https://forms.gle/dfYfRpim7bXLJSUS8',
      school: configured.school || 'https://forms.gle/65dGDGuxarWbPo4v9'
    };
  }

  function textElement(tag, text, className) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    element.textContent = text == null ? '' : String(text);
    return element;
  }

  function routeLabel(route) {
    const item = menuItems.find((menuItem) => menuItem.route === route);
    return item ? item.label : 'FioMUN';
  }

  function applyTheme() {
    const primary = String(getPath(data, 'theme.primary', '#12356f'));
    const accent = String(getPath(data, 'theme.accent', '#6faf3c'));
    const colorPattern = /^#[0-9a-f]{6}$/i;
    if (colorPattern.test(primary)) document.documentElement.style.setProperty('--navy', primary);
    if (colorPattern.test(accent)) document.documentElement.style.setProperty('--accent', accent);
  }

  function bindText() {
    $$('[data-bind]').forEach((element) => {
      let value = getPath(pagesData, element.dataset.bind, '');
      const placeholders = {
        'Committee names, levels and issues are loaded from separate Sheets tables.':'Explore the committees and the topics they will debate.',
        'The contact cards below are loaded from the 09_CONTACTS tab. Replace the example addresses before publication.':'Contact the FioMUN team using the details below.'
      };
      if (Object.prototype.hasOwnProperty.call(placeholders, value)) value = placeholders[value];
      element.textContent = String(value || '');
    });
  }

  function renderBrand() {
    $('#brandName').textContent = String(getPath(data, 'config.site_name', 'FioMUN'));
    $('#brandSubtitle').textContent = String(getPath(data, 'config.site_subtitle', 'Fioretti College Model United Nations'));
    $('#brandLogo').src = String(getPath(data, 'assets.logoMarkDataUri', ''));
    const forms = registrationForms();
    $('#siteStatus').textContent = Object.values(forms).some(Boolean)
      ? 'Registration via Google Forms' : 'Registration information';
  }

  function renderNav() {
    const nav = $('#mainNav');
    nav.replaceChildren();

    menuItems.forEach((item) => {
      const link = document.createElement('a');
      link.href = '#' + item.route;
      link.dataset.route = item.route;
      link.className = 'route-link';
      link.textContent = item.label;
      nav.append(link);
    });
  }

  function makeRouteButton(label, route, variant) {
    const link = document.createElement('a');
    link.href = '#' + route;
    link.dataset.route = route;
    link.className = 'button route-link ' + variant;
    link.textContent = label;
    return link;
  }

  function renderHero() {
    const actions = $('#heroActions');
    actions.replaceChildren();

    const primaryRoute = String(getPath(pagesData, 'home.hero.primary_route', 'registrations'));
    const secondaryRoute = String(getPath(pagesData, 'home.hero.secondary_route', 'about'));
    actions.append(
      makeRouteButton(
        Object.values(registrationForms()).some(Boolean)
          ? getPath(pagesData, 'home.hero.primary_label', 'Register') : 'Registration details',
        validRoutes.has(primaryRoute) ? primaryRoute : 'registrations',
        'button-primary'
      ),
      makeRouteButton(
        getPath(pagesData, 'home.hero.secondary_label', 'About FioMUN'),
        validRoutes.has(secondaryRoute) ? secondaryRoute : 'about',
        'button-secondary'
      )
    );

    const meta = $('#homeMeta');
    meta.replaceChildren();
    [
      ['Date', getPath(data, 'config.conference_date', 'To be announced')],
      ['Location', getPath(data, 'config.conference_location', 'Fioretti College Lisse')],
      ['Fee', getPath(data, 'config.conference_fee', 'To be confirmed')]
    ].forEach(([label, value]) => {
      const item = document.createElement('span');
      const strong = textElement('strong', label + ': ');
      item.append(strong, document.createTextNode(String(value || '')));
      meta.append(item);
    });

    const imageUrl = String(getPath(data, 'config.hero_image_url', '')).trim();
    const heroImage = $('#heroImage');
    const heroLogo = $('#heroLogo');
    if (imageUrl && /^(https?:)?\/\//i.test(imageUrl)) {
      heroImage.src = imageUrl;
      heroImage.hidden = false;
      heroLogo.hidden = true;
    } else {
      heroImage.removeAttribute('src');
      heroImage.hidden = true;
      heroLogo.src = String(getPath(data, 'assets.logoFullDataUri', ''));
      heroLogo.hidden = false;
    }
  }

  function renderCards(containerSelector, cards) {
    const container = $(containerSelector);
    container.replaceChildren();

    (cards || []).forEach((card) => {
      const article = document.createElement('article');
      article.className = containerSelector === '#homeSummaryCards' ? 'summary-point' : 'value-card';
      article.append(
        textElement('span', card.label),
        textElement('h3', card.title),
        textElement('p', card.text)
      );
      container.append(article);
    });
  }

  // Programme entries may carry "day" (Thursday-Sunday) or an ISO "date".
  // Keep undated legacy entries visible until the source spreadsheet provides days.
  function programmeDayIndex(item) {
    if (!item || typeof item !== 'object') return -1;
    const value = String(item.day || item.weekday || item.date || '').trim().toLowerCase();
    if (!value) return -1;
    const aliases = {
      thursday: 0, thu: 0, thurs: 0, donderdag: 0, do: 0,
      friday: 1, fri: 1, vrijdag: 1, vr: 1,
      saturday: 2, sat: 2, zaterdag: 2, za: 2,
      sunday: 3, sun: 3, zondag: 3, zo: 3
    };
    const firstWord = value.replace(/[.,]/g, '').split(/\s+/)[0];
    if (Object.prototype.hasOwnProperty.call(aliases, firstWord)) return aliases[firstWord];

    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const date = new Date(value + 'T12:00:00Z');
      if (!Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value) {
        const weekdays = {4: 0, 5: 1, 6: 2, 0: 3};
        return Object.prototype.hasOwnProperty.call(weekdays, date.getUTCDay())
          ? weekdays[date.getUTCDay()] : -1;
      }
    }
    return -1;
  }

  function programmeRow(item) {
    const row = document.createElement('div');
    row.className = 'programme-row';
    const time = textElement('time', item.time);
    const copy = document.createElement('div');
    copy.append(textElement('strong', item.title), textElement('p', item.text));
    row.append(time, copy);
    return row;
  }

  function renderProgramme() {
    const list = $('#programmeList');
    list.replaceChildren();
    const entries = Array.isArray(data.programme) ? data.programme : [];
    const days = ['Thursday', 'Friday', 'Saturday', 'Sunday'];
    const groups = days.map(() => []);
    const withoutDay = [];

    entries.forEach((item) => {
      const index = programmeDayIndex(item);
      if (index >= 0) groups[index].push(item);
      else withoutDay.push(item);
    });

    if (groups.some((group) => group.length > 0)) {
      list.classList.add('has-days');
      const controls = document.createElement('div');
      controls.className = 'programme-day-controls';
      const previous = textElement('button', '\u2039', 'programme-arrow');
      previous.type = 'button';
      previous.setAttribute('aria-label', 'Previous day');
      previous.setAttribute('aria-controls', 'programmeDayEvents');

      const heading = document.createElement('div');
      heading.className = 'programme-day-heading';
      const dayName = textElement('strong', '', 'programme-day-name');
      dayName.setAttribute('aria-live', 'polite');
      const dayCount = textElement('span', '', 'programme-day-count');
      heading.append(dayName, dayCount);

      const next = textElement('button', '\u203a', 'programme-arrow');
      next.type = 'button';
      next.setAttribute('aria-label', 'Next day');
      next.setAttribute('aria-controls', 'programmeDayEvents');
      controls.append(previous, heading, next);

      const dayEvents = document.createElement('div');
      dayEvents.id = 'programmeDayEvents';
      dayEvents.className = 'programme-day-events';
      dayEvents.setAttribute('role', 'region');
      dayEvents.setAttribute('aria-label', 'Events for selected day');
      let selected = Math.max(0, groups.findIndex((group) => group.length > 0));

      function showDay(index) {
        selected = Math.max(0, Math.min(days.length - 1, index));
        dayName.textContent = days[selected];
        dayCount.textContent = 'Day ' + (selected + 1) + ' of ' + days.length;
        previous.disabled = selected === 0;
        next.disabled = selected === days.length - 1;
        dayEvents.replaceChildren();
        if (groups[selected].length === 0) {
          dayEvents.append(textElement('p', 'The programme for ' + days[selected] + ' is coming soon.', 'programme-empty'));
        } else {
          groups[selected].forEach((item) => dayEvents.append(programmeRow(item)));
        }
      }

      previous.addEventListener('click', () => showDay(selected - 1));
      next.addEventListener('click', () => showDay(selected + 1));
      controls.addEventListener('keydown', (event) => {
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
          event.preventDefault();
          showDay(selected + (event.key === 'ArrowRight' ? 1 : -1));
        }
      });

      // Horizontal swipe between days, while preserving normal vertical scrolling.
      let touchStart = null;
      dayEvents.addEventListener('touchstart', (event) => {
        if (event.touches.length === 1) {
          touchStart = {x: event.touches[0].clientX, y: event.touches[0].clientY};
        }
      }, {passive: true});
      dayEvents.addEventListener('touchend', (event) => {
        if (!touchStart || event.changedTouches.length !== 1) return;
        const dx = event.changedTouches[0].clientX - touchStart.x;
        const dy = event.changedTouches[0].clientY - touchStart.y;
        touchStart = null;
        if (Math.abs(dx) >= 55 && Math.abs(dx) > Math.abs(dy) * 1.4) {
          showDay(selected + (dx < 0 ? 1 : -1));
        }
      }, {passive: true});
      dayEvents.addEventListener('touchcancel', () => { touchStart = null; });

      list.append(controls, dayEvents);
      // Never lose existing events because their day has not yet been supplied.
      if (withoutDay.length > 0) {
        const unassigned = document.createElement('section');
        unassigned.className = 'programme-unassigned';
        unassigned.append(textElement('h3', 'Day to be confirmed'));
        withoutDay.forEach((item) => unassigned.append(programmeRow(item)));
        list.append(unassigned);
      }
      showDay(selected);
    } else {
      list.classList.remove('has-days');
      entries.forEach((item) => list.append(programmeRow(item)));
    }

    const details = $('#conferenceDetails');
    details.replaceChildren();
    (data.details || []).forEach((item) => {
      const row = document.createElement('div');
      row.append(textElement('dt', item.label), textElement('dd', item.value));
      details.append(row);
    });
  }

  function renderCommittees() {
    const list = $('#committeesList');
    list.replaceChildren();

    (data.committees || []).forEach((committee) => {
      const article = document.createElement('article');
      article.className = 'committee';

      const code = textElement('div', committee.code, 'committee-code');
      const identity = document.createElement('div');
      identity.append(
        textElement('h3', committee.name),
        textElement('p', committee.level, 'committee-level'),
        textElement('p', committee.description, 'committee-description')
      );

      const issues = document.createElement('div');
      issues.className = 'issues';
      (committee.issues || []).forEach((issue, index) => {
        const row = document.createElement('div');
        row.className = 'issue';
        row.append(
          textElement('span', 'Issue ' + (index + 1)),
          textElement('strong', issue.title)
        );
        issues.append(row);
      });

      article.append(code, identity, issues);
      list.append(article);
    });
  }

  function renderContacts() {
    const container = $('#contactCards');
    container.replaceChildren();

    (data.contacts || []).forEach((contact) => {
      const card = document.createElement('article');
      card.className = 'contact-card';
      card.append(textElement('h3', contact.name), textElement('p', contact.role));

      if (contact.email) {
        const email = document.createElement('a');
        email.href = 'mailto:' + String(contact.email).replace(/[^a-z0-9@._+\-]/gi, '');
        email.textContent = contact.email;
        card.append(email);
      }

      if (contact.phone) card.append(textElement('p', contact.phone));
      container.append(card);
    });
  }

  function renderRegistrationLinks() {
    const container = $('#registrationLinks');
    const forms = registrationForms();
    const choices = [
      {name: 'Student Officer', key: 'staff', description: 'For students applying to become FioMUN student officers.'},
      {name: 'Individual', key: 'individual', description: 'For individual delegates registering for FioMUN.'},
      {name: 'School', key: 'school', description: 'For schools registering a delegation.'}
    ];
    container.replaceChildren();
    choices.forEach((choice) => {
      const card = document.createElement('article');
      card.className = 'contact-card';
      card.append(textElement('h3', choice.name), textElement('p', choice.description));
      const url = String(forms[choice.key] || '');
      if (/^https:\/\/(?:forms\.gle\/[A-Za-z0-9_-]+|docs\.google\.com\/forms\/(?:u\/\d+\/)?d\/(?:e\/)?[A-Za-z0-9_-]+\/viewform)(?:[?#][^\s<>"']*)?$/i.test(url)) {
        const link = document.createElement('a');
        link.href = url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = 'Open Google Form ↗';
        card.append(link);
      } else {
        card.append(textElement('p', 'Registration link coming soon.'));
      }
      container.append(card);
    });
  }

  function safeRoute(route) {
    return validRoutes.has(route) && document.querySelector('[data-page="' + CSS.escape(route) + '"]')
      ? route
      : 'home';
  }

  function showRoute(route, moveFocus) {
    const selectedRoute = safeRoute(route);
    $$('.page').forEach((page) => page.classList.toggle('active', page.dataset.page === selectedRoute));
    $$('.route-link').forEach((link) => {
      const active = link.dataset.route === selectedRoute;
      link.classList.toggle('active', active);
      if (link.closest('nav')) {
        if (active) link.setAttribute('aria-current', 'page');
        else link.removeAttribute('aria-current');
      }
    });

    $('#mainNav').classList.remove('open');
    $('.menu-button').setAttribute('aria-expanded', 'false');
    document.title = routeLabel(selectedRoute) + ' - FioMUN';
    window.scrollTo({ top: 0, behavior: 'auto' });

    if (moveFocus) {
      const heading = document.querySelector('[data-page="' + CSS.escape(selectedRoute) + '"] h1');
      if (heading) {
        heading.setAttribute('tabindex', '-1');
        heading.focus({ preventScroll: true });
      }
    }
  }

  function attachNavigation() {
    document.addEventListener('click', (event) => {
      const link = event.target.closest('.route-link');
      if (!link) return;
      const route = safeRoute(link.dataset.route || 'home');
      event.preventDefault();
      if (location.hash !== '#' + route) history.pushState(null, '', '#' + route);
      showRoute(route, true);
    });

    $('.menu-button').addEventListener('click', () => {
      const nav = $('#mainNav');
      const open = nav.classList.toggle('open');
      $('.menu-button').setAttribute('aria-expanded', String(open));
    });

    window.addEventListener('popstate', () => {
      showRoute(location.hash.slice(1) || 'home', false);
    });
    window.addEventListener('hashchange', () => {
      showRoute(location.hash.slice(1) || 'home', false);
    });
  }

  function initialise() {
    applyTheme();
    bindText();
    renderBrand();
    renderNav();
    renderHero();
    renderCards('#homeSummaryCards', getPath(data, 'cards.home_summary', []));
    renderCards('#aboutValueCards', getPath(data, 'cards.about_values', []));
    renderProgramme();
    renderCommittees();
    renderContacts();
    renderRegistrationLinks();
    attachNavigation();

    const routeFromHash = location.hash.replace(/^#/, '');
    const initialRoute = routeFromHash || window.__INITIAL_ROUTE__ || 'home';
    showRoute(initialRoute, false);
  }

  initialise();
})();
