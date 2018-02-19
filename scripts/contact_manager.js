var app = {
  tags: [],
  contacts: [],
  init() {
    this.loadLocalTags();
    this.loadLocalContacts();
    this.compileTemplates();
    this.renderTemplates();
    this.bindEvents();
    Contact.lastId = this.contacts.reduce(function(max, current) {
      if (current.id > max) {
        max = current.id;
      }
      return max;
    }, 0);
    this.parseURL();
  },
  compileTemplate(id) {
    return Handlebars.compile($(id).html());
  },
  compileTemplates() {
    this.tagsTemplate = this.compileTemplate('#tags-template');
    this.tagTemplate = this.compileTemplate('#tag-template');
    this.cardTemplate = this.compileTemplate('#card-template');
    this.cardSectionTemplate = this.compileTemplate('#card-section-template');
    this.editTemplate = this.compileTemplate('#edit');
    this.createTemplate = this.compileTemplate('#create');

    Handlebars.registerPartial('contactForm', $('#contactForm').html());
    Handlebars.registerPartial('card', $('#card-template').html());
    Handlebars.registerPartial('tag', $('#tag-template').html());
  },
  renderTemplates() {
    this.renderTagsTemplate();
    this.renderCards();
  },
  renderTagsTemplate() {
    var tags = this.tags.map(function(tag) {
      return tag.name;
    });
    $('aside .container').empty().append(this.tagsTemplate({tags: tags}));
  },
  renderCards() {
    $('.contacts').empty().append(this.cardSectionTemplate({contacts: this.contacts}));
  },
  bindEvents() {
    $(document).on('click', '.create', function(e) {
      e.preventDefault();
      e.stopPropagation();
      history.pushState({action: 'create'}, 'Create', '#contacts/new');
      this.showCreateForm();

    }.bind(this));

    $(document).on('click', '.edit', function(e) {
      e.preventDefault();
      var contactId = this.getIdFromUrl(e.target.href);
      history.pushState({action: 'edit', contact: contactId}, 'Edit', '#contacts/edit/' + contactId)
      this.showEditForm(contactId);
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
      this.hideForm($form);
    }.bind(this));

    $(document).on('submit', '#create-form', function(e) {
      e.preventDefault();
      this.formSubmit(e, 'create');
      this.pushHomeState()
    }.bind(this));

    $(document).on('submit', '#edit-form', function(e) {
      e.preventDefault();
      this.formSubmit(e, 'edit');
      this.pushHomeState()
    }.bind(this));

    $(document).on('keyup', '.search', function(e) {
      clearTimeout(search.timeout);
      search.timeout = setTimeout(function() {
        search.exe(e);
      }, 400);
    });

    $('main').on('change', '.checkbox-tag', function(e) {
      this.filterByTag(e);
    }.bind(this));

    $('main').on('change', '#all', function(e) {
      this.toggleAllTags(e);
    }.bind(this));

    $(window).on('popstate', function() {
      this.hideForm(this.visibleForm());
      this.parseURL();
    }.bind(this))

    $(window).on('unload', function() {
      this.saveLocal();
    }.bind(this));
  },

  showCreateForm() {
    $('main').append(this.createTemplate);
    $('#create-form').slideDown();
  },

  showEditForm(contactId) {
    var contact = this.contacts.find(function(contact) {
      return contact.id === contactId;
    });

    if (contact) {
      $('main').append(this.editTemplate(contact));
      $('#edit-form').slideDown();
    } else {
      this.pushHomeState();
      this.parseURL();
    }
  },

  hideForm($form) {
    $form.slideToggle(400, function() {
      $form.remove();
    });
  },

  visibleForm() {
    return $('form').filter(function() {return $(this).css('display')==='block'});
  },

  registerContact(contact) {
    this.contacts.push(contact);
    if (this.contacts.length === 1) {
      this.renderCards();
    } else {
      $('.rolodex').append(this.cardTemplate(contact));
    }
    this.registerTags(contact.tags);
  },

  updateContact(contact) {
    var currentIdx = this.findIndex(contact.id)
    this.updateTags(contact.id, currentIdx);
    this.contacts.splice(currentIdx, 1, contact);
    var html = this.cardTemplate(contact);
    $('.card[data-id="' + contact.id + '"]').replaceWith(html);
    this.registerTags(contact.tags);
  },

  findIndex(id) {
    return this.contacts.findIndex(function(oldContact) {
      return oldContact.id === id;
    });
  },

  registerTags(tags) {
    if (tags.length === 0) {
      return;
    }
    tags.forEach(function(tag) {
      var tagIndex = this.tags.findIndex(function(existingTag) {
        return existingTag.name === tag;
      });

      if (tagIndex === -1) {
        this.tags.push(new Tag(tag));
        if (this.tags.length > 1) {
          $('aside ul').append(this.tagTemplate(tag));
        } else if (this.tags.length === 1) {
          this.renderTagsTemplate();
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
      this.hideForm($target);

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
    history.pushState({}, 'Home', '/#home');
  },

  parseURL() {
    var href = document.location.href;
    var action = '';
    var id;
    if (href.indexOf('#home') !== -1 || href.indexOf('#') === -1 ) {


    } else {
      action = this.getActionFromUrl(href);

      switch (action) {
      case 'delete':
        id = this.getIdFromUrl(href);
        if (this.findIndex(id) !== -1) {
          this.delete(id);
        }
        break;
      case 'create':
        this.showCreateForm();
        break;
      case 'edit':
        id = this.getIdFromUrl(href);
        if (this.findIndex(id) !== -1) {
          this.showEditForm(id);
        }
        break;
      }
    }
  },

  getActionFromUrl(url) {
    if (url.indexOf('delete') !== -1) {
      return 'delete'
    } else if (url.indexOf('new') !== -1) {
      return 'create'
    } else if (url.indexOf('edit') !== -1) {
      return 'edit'
    }
  },

  getIdFromUrl(url) {
    var urlSlice = url.match(/#.+\/.+\//);
    var idIdx = urlSlice.index + urlSlice[0].length;
    return parseInt(url.slice(idIdx));
  },

  filterByTag(e) {
    var checked = e.target.checked;
    var changedTag = e.target.id;
    var appTag = this.tags.find(function(tag) {
      return tag.name === changedTag;
    });

    this.contacts.forEach(function(contact) {
      if (contact.tags.find(function(tag) {
        return tag === changedTag;
      })) {
        if (checked) {
          appTag.checked = true;
          $('.card[data-id="' + contact.id + '"]').show();
        } else {
          appTag.checked = false;
          var inactiveTagCount =  contact.tags.reduce(function(count, tag) {
            if (!this.tags.find(function(appTag) {
              return appTag.name === tag;
            }).checked) {
              count++;
            }
            return count;
          }.bind(this), 0);
          if (inactiveTagCount === contact.tags.length) {
            $('.card[data-id="' + contact.id + '"]').hide();
          }
        }
      }
    }.bind(this));
  },

  toggleAllTags(e) {
    if (e.target.checked) {
      $('.checkbox-tag').each(function() {
        if (!this.checked) {
          this.click();
        }
      })
    } else {
      $('.checkbox-tag').each(function() {
        if (this.checked) {
          this.click();
        }
      });
    }
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
      this.contacts = JSON.parse(localContacts);
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

  updateTags(id, contactIdx) {
    var contactTags = this.contacts[contactIdx].tags;
    for (var i = this.tags.length - 1; i >= 0; i--) {
      var tag = this.tags[i];

      if (contactTags && contactTags.indexOf(tag.name) !== -1) {
        tag.count--;

        if (tag.count === 0) {
          this.tags.splice(i, 1);
          this.renderTagsTemplate();
        }
      }
    }
  },

  delete(targetId) {
    var contactIdx = this.findIndex(targetId);

    if (confirm('Delete this contact?')) {
      $('.card[data-id="' + targetId + '"]').remove();
      this.updateTags(targetId, contactIdx);
      this.contacts.splice(contactIdx, 1);

      if (this.contacts.length === 0) {
        this.renderCards();
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
};

function Tag(name)  {
  this.name = name;
  this.count = 1;
  this.checked = true;
}

var search = {
  timeout: null,
  exe(e) {
    var nameExp = new RegExp(e.target.value, 'i');
    var $noResults = $('.no-results');
    var hideCount = 0;

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

Handlebars.registerHelper('join', function(arr) {
  return arr.join(', ');
});

app.init();
