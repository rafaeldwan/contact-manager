var app = {
  tags: [],
  contacts: [],

  init() {
    this.loadLocalTags();
    this.loadLocalContacts();
    templates.compileAll();
    templates.render();
    this.bindEvents();
    Contact.lastId = this.contacts.reduce(function(max, current) {
      if (current.id > max) {
        max = current.id;
      }
      return max;
    }, 0);
    this.parseURL();
  },

  bindEvents() {
    $(document).on('click', '.create', function(e) {
      e.preventDefault();
      e.stopPropagation();

      history.pushState({action: 'create'}, 'Create', '#contacts/new');
      view.showCreateForm();
    }.bind(this));

    $(document).on('click', '.edit', function(e) {
      e.preventDefault();
      var contactId = this.getIdFromUrl(e.target.href);

      history.pushState({action: 'edit', contact: contactId}, 'Edit', '#contacts/edit/' + contactId);
      view.showEditForm(contactId);
    }.bind(this));

    $(document).on('click', '.delete', function(e) {
      e.preventDefault();
      e.stopPropagation();
      var targetId = $(e.target).parents('.card').data('id');

      this.delete(targetId);
    }.bind(this));

    $(document).on('click', '.cancel', function(e) {
      e.preventDefault;
      var $form = $(e.target).parents('form');

      this.pushHomeState();
      view.hideForm($form);
    }.bind(this));

    $(document).on('submit', '#create-form', function(e) {
      e.preventDefault();

      this.formSubmit(e, 'create');
      this.pushHomeState();
    }.bind(this));

    $(document).on('submit', '#edit-form', function(e) {
      e.preventDefault();

      this.formSubmit(e, 'edit');
      this.pushHomeState();
    }.bind(this));

    $(document).on('keyup', '.search', function(e) {
      clearTimeout(search.timeout);

      search.timeout = setTimeout(function() {
        search.exe(e);
      }, 400);
    });

    $('main').on('change', '.checkbox-tag', function(e) {
      view.filterByTag(e);
    }.bind(this));

    $('main').on('change', '#all', function() {
      view.toggleAllTags();
    });

    $('main').on('click', '.tag', function(e) {
      view.showOnlyTargetTag(e);
    });

    $(window).on('popstate', function() {
      view.hideForm(view.visibleForm());
      this.parseURL();
    }.bind(this));

    $(window).on('unload', function() {
      this.saveLocal();
    }.bind(this));
  },

  registerContact(contact) {
    this.contacts.push(contact);

    if (this.contacts.length === 1) {
      templates.renderCards();
    } else {
      $('.rolodex').append(templates.card(contact));
    }

    this.registerTags(contact.tags);
  },

  updateContact(contact) {
    var currentIdx = this.findContactIdx(contact.id);
    var html = templates.card(contact);

    this.updateTags(currentIdx);

    this.contacts.splice(currentIdx, 1, contact);

    $('.card[data-id="' + contact.id + '"]').replaceWith(html);

    this.registerTags(contact.tags);
  },

  findContactIdx(id) {
    return this.contacts.findIndex(function(oldContact) {
      return oldContact.id === id;
    });
  },

  findTagIdx(tag) {
    return this.tags.findIndex(function(existingTag) {
      return existingTag.name === tag;
    });
  },

  registerTags(tags) {
    if (tags.length === 0) {
      return;
    }

    tags.forEach(function(tag) {
      var tagIndex = this.findTagIdx(tag);

      if (tagIndex === -1) {
        this.tags.push(new Tag(tag));
        if (this.tags.length > 1) {
          $('aside ul').append(templates.tag(tag));
        } else if (this.tags.length === 1) {
          templates.renderTags();
        }
      } else {
        this.tags[tagIndex].count++;
      }
    }.bind(this));
  },

  formSubmit(e, action) {
    var $target = $(e.target);
    var results = {};

    $target.serializeArray().forEach(function(input) {
      results[input.name] = input.value.trim();
    });

    if (this.verifyInput(results)) {
      view.hideForm($target);

      if (action === 'create') {
        results.id = Contact.generateId();
        this.registerContact(Object.create(Contact).init(results));
      } else {
        results.id = $target.data('id');
        this.updateContact(Object.create(Contact).init(results));
      }
    }
  },

  verifyInput(input) {
    if (input.name === '') {
      alert('Name cannot be blank');
      return false;
    } else {
      return true;
    }
  },

  pushHomeState() {
    history.pushState({}, 'Home', '#home');
  },

  parseURL() {
    var href = document.location.href;
    var action = '';
    var id;

    if (href.indexOf('#home') === -1 && href.indexOf('#') !== -1 ) {
      action = this.getActionFromUrl(href);

      switch (action) {
      case 'delete':
        id = this.getIdFromUrl(href);
        if (this.findContactIdx(id) !== -1) {
          this.delete(id);
        }
        this.pushHomeState();
        break;
      case 'create':
        view.showCreateForm();
        break;
      case 'edit':
        id = this.getIdFromUrl(href);
        if (this.findContactIdx(id) !== -1) {
          view.showEditForm(id);
        }
        break;
      }
    }
  },

  getActionFromUrl(url) {
    if (url.indexOf('delete') !== -1) {
      return 'delete';
    } else if (url.indexOf('new') !== -1) {
      return 'create';
    } else if (url.indexOf('edit') !== -1) {
      return 'edit';
    }
  },

  getIdFromUrl(url) {
    var urlSlice = url.match(/#.+\/.+\//);
    var idIdx = urlSlice.index + urlSlice[0].length;
    return parseInt(url.slice(idIdx));
  },

  saveLocal() {
    this.saveContacts();
    this.saveTags();
  },

  saveContacts() {
    var contacts = JSON.stringify(this.contacts);
    localStorage.setItem('contacts', contacts);
  },

  saveTags() {
    var tags = JSON.stringify(this.tags);
    localStorage.setItem('tags', tags);
  },

  loadLocalContacts() {
    var localContacts = localStorage.getItem('contacts');

    if (localContacts !== 'undefined' && localContacts !== null) {
      this.contacts = JSON.parse(localContacts).map(function(contact) {
        return Object.create(Contact).restore(contact);
      });
    } else {
      this.contacts = [];
    }
  },

  loadLocalTags() {
    var localTags = localStorage.getItem('tags');

    if (localTags !== 'undefined' && localTags !== null) {
      this.tags = JSON.parse(localTags);
    } else {
      this.tags = [];
    }
  },

  updateTags(contactIdx) {
    // used after a contact delete or edit.
    // removes a tag from memory and display if no longer present
    // on any contact
    var contactTags = this.contacts[contactIdx].tags;

    for (var i = this.tags.length - 1; i >= 0; i--) {
      var tag = this.tags[i];

      if (contactTags && contactTags.indexOf(tag.name) !== -1) {
        tag.count--;

        if (tag.count === 0) {
          this.tags.splice(i, 1);
          templates.renderTags();
        }
      }
    }
  },

  delete(targetId) {
    var contactIdx = this.findContactIdx(targetId);

    if (confirm('Delete this contact?')) {
      $('.card[data-id="' + targetId + '"]').remove();
      this.updateTags(contactIdx);
      this.contacts.splice(contactIdx, 1);

      if (this.contacts.length === 0) {
        templates.renderCards();
      }
    }
  },
};

var templates = {
  compile(id) {
    return Handlebars.compile($(id).html());
  },

  compileAll() {
    this.tags = this.compile('#tags-template');
    this.tag = this.compile('#tag-template');
    this.card = this.compile('#card-template');
    this.cardSection = this.compile('#card-section-template');
    this.edit = this.compile('#edit');
    this.create = this.compile('#create');

    Handlebars.registerPartial('contactForm', $('#contactForm').html());
    Handlebars.registerPartial('card', $('#card-template').html());
    Handlebars.registerPartial('tag', $('#tag-template').html());

    Handlebars.registerHelper('join', function(arr) {
      return arr.join(', ');
    });
  },

  render() {
    this.renderTags();
    this.renderCards();
  },

  renderTags() {
    var tagNames = app.tags.map(function(tag) {
      return tag.name;
    });
    $('aside .container').empty().append(this.tags({tags: tagNames}));
  },

  renderCards() {
    $('.contacts').empty().append(this.cardSection({contacts: app.contacts}));
  },
};

var view = {
  showCreateForm() {
    $('main').append(templates.create);
    $('#create-form').slideDown();
  },

  showEditForm(contactId) {
    var contact = app.contacts.find(function(contact) {
      return contact.id === contactId;
    });

    if (contact) {
      $('main').append(templates.edit(contact));
      $('#edit-form').slideDown();
    } else {
      app.pushHomeState();
      app.parseURL();
    }
  },

  hideForm($form) {
    $form.slideToggle(400, function() {
      $form.remove();
    });
  },

  visibleForm() {
    return $('form').filter(function() {
      return $(this).css('display') === 'block';
    });
  },

  filterByTag(e) {
    search.reset();

    app.contacts.forEach(function(contact) {
      var checked = e.target.checked;
      var changedTag = e.target.id;
      var appTag = app.tags.find(function(tag) {
        return tag.name === changedTag;
      });

      if (contact.hasTag(changedTag)) {

        if (checked) {
          appTag.checked = true;
          $('.card[data-id="' + contact.id + '"]').show();
        } else {
          appTag.checked = false;
          $('#all').prop('checked', false);
          if (this.allTagsInactive(contact)) {
            $('.card[data-id="' + contact.id + '"]').hide();
          }
        }
      }
    }.bind(this));

    this.allNoneOrSomeChecked();
  },

  toggleAllTags() {
    if ($('#all').get(0).checked) {
      $('.checkbox-tag').each(function() {
        if (!this.checked) {
          this.click();
        }
      });
    } else {
      $('.checkbox-tag').each(function() {
        if (this.checked) {
          this.click();
        }
      });
    }
  },

  showOnlyTargetTag(e) {
    if ($('#all').prop('checked')) {
      $('#all').click();
    } else {
      this.toggleAllTags();
    }

    $('.checkbox-tag').filter(function() {
      return $(this).parent().text() ===  e.target.textContent;
    }).click();
  },

  checkAllTags() {
    if ($('#all').prop('checked')) {
      this.toggleAllTags();
    } else {
      $('#all').click();
    }
  },

  allTagsInactive(contact) {
    var inactiveTagCount = contact.tags.reduce(function(count, tag) {
      if (!app.tags.find(function(currentTag) {
        return currentTag.name === tag;
      }).checked) {
        count++;
      }
      return count;
    }, 0);

    return inactiveTagCount === contact.tags.length;
  },

  allNoneOrSomeChecked() {
    // so ALL TAG checkbox updates itself and the
    // 'no results' div is shown and hidden intelligently
    var $noResults = $('.no-results');
    var checkedCount = app.tags.reduce(function(count, tag) {
      if (tag.checked) {
        count++;
      }
      return count;
    }, 0);

    if (checkedCount === 0) {
      $('#all').prop('checked', false);
      $noResults.show();
    } else {
      if ($noResults.css('display') === 'block') {
        $noResults.hide();
      }
      if (checkedCount === app.tags.length) {
        $('#all').prop('checked', true);
      }
    }
  },
};

var Contact = {
  init(formData) {
    this.id = formData.id ? formData.id : this.generateId();
    this.name = formData.name;
    this.email = formData.email;
    this.phone = formData.phone;
    this.tags = this.processTags(formData);
    return this;
  },

  restore(storedContact) {
    this.id = storedContact.id;
    this.name = storedContact.name;
    this.email = storedContact.email;
    this.phone = storedContact.phone;
    this.tags = storedContact.tags;
    return this;
  },

  generateId() {
    return ++this.lastId;
  },

  processTags(formData) {
    var tags = formData.tags.split(/\s*,\s*/).filter(function(tag) {
      return tag !== '';
    });

    return tags.reduce(function(arr, tag) {
      if (arr.indexOf(tag) === -1) {
        arr.push(tag);
      }
      return arr;
    }, []);
  },

  hasTag(tag) {
    return this.tags.find(function(currentTag) {
      return currentTag === tag;
    });
  }
};

var search = {
  timeout: null,

  reset() {
    if ($('.search').val() !== '') {
      $('.search').val('');
      $('.card').show();
    }
  },

  exe(e) {
    var searchString = e.target.value;
    var nameExp = new RegExp(searchString, 'i');
    var $noResults = $('.no-results');
    var hideCount = 0;

    view.checkAllTags();
    $('.search').val(searchString);

    app.contacts.forEach(function(contact) {
      if (nameExp.test(contact.name)) {
        // easy to add email to search by || nameExp.test(contact.email) here
        $('.card[data-id="' + contact.id + '"]').show();

        if ($noResults.css('display') === 'block') {
          $noResults.hide();
        }
      } else {
        $('.card[data-id="' + contact.id + '"]').hide();
        hideCount++;
        if (hideCount === app.contacts.length) {
          $noResults.show();
        }
      }

    });
  },
};

function Tag(name)  {
  this.name = name;
  this.count = 1;
  this.checked = true;
}

app.init();
