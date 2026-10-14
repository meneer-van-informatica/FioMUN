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
    const forms = getPath(data, 'registration.forms', {});
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
        Object.values(getPath(data, 'registration.forms', {})).some(Boolean)
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

  function renderProgramme() {
    const list = $('#programmeList');
    list.replaceChildren();

    (data.programme || []).forEach((item) => {
      const row = document.createElement('div');
      row.className = 'programme-row';
      const time = textElement('time', item.time);
      const copy = document.createElement('div');
      copy.append(textElement('strong', item.title), textElement('p', item.text));
      row.append(time, copy);
      list.append(row);
    });

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
    const forms = getPath(data, 'registration.forms', {});
    const choices = [
      {name: 'Staff', key: 'staff', description: 'For students applying to join the FioMUN staff team.'},
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
