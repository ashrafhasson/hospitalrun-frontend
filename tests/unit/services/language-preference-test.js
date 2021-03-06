import { reject } from 'rsvp';
import Service from '@ember/service';
import { module, test } from 'qunit';
import { setupTest } from 'ember-qunit';
import { DEFAULT_LANGUAGE } from 'hospitalrun/services/language-preference';
import sinon from 'sinon';

const preferences = {
  _id: 'preferences',
  hradmin: {
    intl: 'es'
  },
  'testuser@test.ts': {
    intl: 'fr'
  }
};

const configDb = {};

const currentUser = sinon.stub();

const config = Service.extend({
  getCurrentUser() {
    return currentUser();
  },
  getConfigDB() {
    return configDb;
  }
});

module('Unit | Service | Language preference', function(hooks) {
  setupTest(hooks);

  hooks.beforeEach(function() {
    configDb.get = sinon.stub().withArgs('preferences').resolves(preferences);
    configDb.put = sinon.stub();

    this.owner.register('service:config', config);
    this.owner.register('service:intl', Service.extend({}));
  });

  hooks.afterEach(function() {
    configDb.get.reset();
    configDb.put.reset();
    currentUser.reset();

    // in case of any leftover tests that have modified the direction1
    document.body.dir = 'auto';
  });

  test('loadUserLanguagePreference should return user language preference', function(assert) {
    currentUser.returns({ name: 'testuser@test.ts' });

    let subject = this.owner.lookup('service:language-preference');
    return subject.loadUserLanguagePreference().then(function(lang) {
      assert.equal(lang, 'fr');
      assert.deepEqual(subject.get('intl.locale'), [lang, DEFAULT_LANGUAGE], 'intl service was not updated');
    });
  });

  test("loadUserLanguagePreference should return default language if user's preference is not found", function(assert) {
    currentUser.returns({ name: 'no-such-user@test.ts' });

    let subject = this.owner.lookup('service:language-preference');
    return subject.loadUserLanguagePreference().then(function(lang) {
      assert.equal(lang, DEFAULT_LANGUAGE);
      assert.deepEqual(subject.get('intl.locale'), [DEFAULT_LANGUAGE], 'intl service was not updated');
    });
  });

  test('loadUserLanguagePreference should return default language if there are no user', function(assert) {
    currentUser.returns(undefined);

    let subject = this.owner.lookup('service:language-preference');
    return subject.loadUserLanguagePreference().then(function(lang) {
      assert.equal(lang, DEFAULT_LANGUAGE);
      assert.deepEqual(subject.get('intl.locale'), [DEFAULT_LANGUAGE], 'intl service was not updated');
    });
  });

  test('loadUserLanguagePreference sinon test should return default language if there are no preferences', function(assert) {
    configDb.get.withArgs('preferences').returns(reject('no preferences'));

    currentUser.returns({ name: 'testuser.ts' });

    let subject = this.owner.lookup('service:language-preference');
    return subject.loadUserLanguagePreference().then(function(lang) {
      assert.equal(lang, DEFAULT_LANGUAGE);
      assert.deepEqual(subject.get('intl.locale'), [DEFAULT_LANGUAGE], 'intl service was not updated');
    });
  });

  test('saveUserLanguagePreference should update existing user setting', function(assert) {
    currentUser.returns({ name: 'hradmin' });

    let expectedPreferences = JSON.parse(JSON.stringify(preferences));
    expectedPreferences.hradmin.intl = 'ru';

    let subject = this.owner.lookup('service:language-preference');
    return subject.saveUserLanguagePreference('ru').then(function() {
      sinon.assert.calledOnce(configDb.put);
      sinon.assert.calledWith(configDb.put, expectedPreferences);
      assert.deepEqual(subject.get('intl.locale'), ['ru', DEFAULT_LANGUAGE], 'intl service was not updated');
    });
  });

  test("saveUserLanguagePreference should update preferences when user doesn't exist", function(assert) {
    currentUser.returns({ name: 'no-such-user@test.ts' });

    let expectedPreferences = Object.assign({}, preferences, {
      'no-such-user@test.ts': {
        intl: 'ru'
      }
    });

    let subject = this.owner.lookup('service:language-preference');
    return subject.saveUserLanguagePreference('ru').then(function() {
      sinon.assert.calledOnce(configDb.put);
      sinon.assert.calledWith(configDb.put, expectedPreferences);
      assert.deepEqual(subject.get('intl.locale'), ['ru', DEFAULT_LANGUAGE], 'intl service was not updated');
    });
  });

  test("saveUserLanguagePreference should create preferences when they doesn't exist", function(assert) {
    currentUser.returns({ name: 'no-such-user@test.ts' });
    configDb.get.withArgs('preferences').rejects('no preferences');

    let expectedPreferences = {
      _id: 'preferences',
      'no-such-user@test.ts': {
        intl: 'ru'
      }
    };

    let subject = this.owner.lookup('service:language-preference');
    return subject.saveUserLanguagePreference('ru').then(function() {
      sinon.assert.calledOnce(configDb.put);
      sinon.assert.calledWith(configDb.put, expectedPreferences);
      assert.deepEqual(subject.get('intl.locale'), ['ru', DEFAULT_LANGUAGE], 'intl service was not updated');
    });
  });

  test('setApplicationLanguage should update intl', function(assert) {
    let subject = this.owner.lookup('service:language-preference');
    subject.setApplicationLanguage('ru');
    assert.deepEqual(subject.get('intl.locale'), ['ru', DEFAULT_LANGUAGE], 'intl service was not updated');
  });

  test('setting a rtl language sets the direction on the body tag', function(assert) {
    let subject = this.owner.lookup('service:language-preference');
    subject.setApplicationLanguage('ar');
    assert.equal(document.body.dir, 'rtl', 'arabic sets dir attribute to right to left');

    subject.setApplicationLanguage('en');
    assert.equal(document.body.dir, 'auto', 'english sets dir attribute back to auto');
  });
});
