/**
 * Editoo Wysiwyg Texteditor
 *
 * @author     André Fiedler <kontakt at visualdrugs dot net>
 * @author     inspired by many other javascript Wysiwyg Editors
 * @link       http://github.com/SunboX/editoo/tree
 * @copyright  2008 - 2009 André Fiedler.
 * @license    MIT License
 * @version    0.9
 */

var Editoo = { version: 0.9 };

Editoo.Richtext = new Class(
{					
	options:
	{
		css: '',
		useCSS: false,
		className: 'editoo'
	},

	initialize: function(area, options)
	{
		if(!$defined(document.execCommand))	return;
		
		// make css file path an absolute
		if($chk(options.css) && !options.css.test(/http(s?):\/\//g))
		{
			var base = window.location.href.split('/');
			if(base[base.length - 1] == '' || base[base.length - 1].test(/(\.|#)/g))
			{
				base[base.length - 1] = options.css;
				options.css = base.join('/');
			} 
			else 
			{
				options.css = window.location.href + '/' + options.css;
			}
		}
		
		this.setOptions(options);
		this.area = $(area);
		
		var coo = this.area.getCoordinates();
		this.frame = new Element('iframe').setProperty('frameborder', 'no').setStyles(
		{
			width: coo.width + 'px',
			height: coo.height + 'px'
			
		}).addClass(this.options.className);
		
		this.frame.addEvent('load', function()
		{
			this.win = this.frame.contentWindow || this.frame;
			this.doc = this.win.document;
			this.doc.body.innerHTML = this.area.getText();
			this.doc.designMode = 'On';
			
			Editoo.Asset.css(this.options.css, this.doc);
			
			this.focus();
			
			if(this.doc.addEventListener) this.doc.addEventListener('keypress',  this.listener.bind(this), true);
			else this.doc.attachEvent('onkeypress',  this.listener.bind(this));
			this.area.addEvent('keypress', this.listener.bind(this));
			this.action('useCSS', options.useCSS ? 1 : 0); // set the editor to use CSS instead of HTML
		}.bind(this));
		
		this.area.setStyle('display', 'none');
		this.frame.injectAfter(this.area);
	},
	
	listener: function(e)
	{
		e = new Event(e)
		
		var sel = new Editoo.Selection(this.win);
		var range = new Editoo.Range(sel);

		if(e.key == 'enter')
		{
			e.stop();
			//this.action('InsertParagraph');
			//inserthtml
			var html = '<br />';
			if(e.control) html = '<p></p>';
			if(window.ie) sel.createRange().pasteHTML(html);
			else this.action(['inserthtml', html]);
		}
	},
	
	getHTML: function()
	{
		return this.doc.body.innerHTML || '';
	},
	
	focus: function()
	{
		try 
		{
			var html = this.getHTML();
			if(html != this.area.value) this.fireEvent('onChange', html);
			this.area.setText(html);
			this.area.value = html;
		} catch(e){}
		this.fireEvent('onFocus', this.win);
		this.win.focus();
	},
	
	action: function(cmd)
	{
		switch(cmd)
		{
			case 'addLink':
				this.addLink();
				break;
				
			case 'removeLink':
				this.removeLink();
				break;
			
			default:
				if($type(cmd) != 'array') cmd = [cmd];	
				try 
				{ 
					this.doc.execCommand(cmd[0], false, cmd[1]); 
				} catch(e) {}
		}
		this.focus();
	},
	
	addLink: function(url)
	{
		var sel = new Editoo.Selection(this.win);
		var range = new Editoo.Range(sel);
		var el = this.getSelectedElement();
		
		var actUrl = 'http://www.';
		if(el.getTag() === 'a')
		{
			actUrl = el.getProperty('href');
		}
		else
		{
			var text = this.getSelectedText();
			var el = new Element('a').setProperty('href', '#').setText(text);
			el = range.replaceSelectionWithElement(el);
			sel.selectElementContents(el);
		}
		
		if(!$chk(url) || url === '') url = prompt('bitte geben sie eine url ein', actUrl || 'http://www.');
		if(url === false) return;
		if(!$chk(url) || url === '') url = '#';
		el.setProperty('href', url);
		
		return el;
	},
	
	removeLink: function()
	{
		var el = this.getSelectedElement();
		if(el.getTag() === 'a') el.parentNode.replaceChild(this.doc.createTextNode(el.getText()), el);
		el = null;
		this.focus();
	},
	
	getSelectedElement: function()
	{
		var sel = new Editoo.Selection(this.win);
		var range = new Editoo.Range(sel);
		return range.getParentElement();
	},
	
	getSelectedText: function()
	{
		var sel = new Editoo.Selection(this.win);
		return sel.getSelectedText();
	}
});

Editoo.Richtext.implement(new Events, new Options);

Editoo.Selection = new Class(
{
	initialize: function(win)
	{
		if(window.ie) return new Editoo.Selection.IE(win);
		else return new Editoo.Selection.MozillaWebkit(win);
	}
});

Editoo.Selection.Base = new Class(
{
	initialize: function(win)
	{
		this.window = win;
		this.document = this.window.document || this.window;
		this.selection = {};
	}
});

Editoo.Selection.IE = Editoo.Selection.Base.extend(
{											   
	initialize: function(win)
	{
		this.parent(win);
		
		this.selection = this.document.selection;
		
		// set default selection properties
		this.type = this.selection.type;
	},
	
	createRange: function()
	{
		return this.selection.createRange();
	},
	
	selectElementContents: function(el)
	{
        /*
		a bit nasty, when moveToElementText is called it will move the selection start
        to just before the element instead of inside it, and since IE doesn't reserve
        an index for the element itself as well the way to get it inside the element is
        by moving the start one pos and then moving it back
		*/
        var range = this.document.body.createTextRange();
     	range.moveToElementText(el);
        range.moveStart('character', 1);
        range.moveStart('character', -1);
        range.moveEnd('character', -1);
        range.moveEnd('character', 1);
        range.select();
    },
	
	getSelectedText: function()
	{
        return this.createRange().text;
    }
});

Editoo.Selection.MozillaWebkit = Editoo.Selection.Base.extend(
{											   
	initialize: function(win)
	{
		this.parent(win);
		this.selection = this.window.getSelection();
		
		// set default selection properties
		this.rangeCount = this.selection.rangeCount;
	},
	
	getRangeAt: function(i)
	{
		if($defined(this.selection.getRangeAt))
		{
			return this.selection.getRangeAt(i);
		}
		else
		{
			return null;	
		}
	},
	
	removeAllRanges: function()
	{
		this.selection.removeAllRanges();
	},
	
	selectElementContents: function(el)
	{
        this.selection.removeAllRanges();
        this.selection.selectAllChildren(el);
    },
	
	getSelectedText: function()
	{
        return this.selection.toString();
    }
});

Editoo.Range = new Class(
{
	initialize: function(selection)
	{
		if(window.ie) return new Editoo.Range.IE(selection);
		else return new Editoo.Range.MozillaWebkit(selection);
	}
});

Editoo.Range.Base = new Class(
{
	initialize: function(selection)
	{
		this.selection = selection;
		this.document = this.selection.document;
	}						 
});

Editoo.Range.IE = Editoo.Range.Base.extend(
{
	initialize: function(selection)
	{
		this.parent(selection);
		
		// if no selection in editable document, IE returns selection from main page, so force an inner selection.
		var doc = selection.document;
	
		this.range = this.selection.createRange()
		var parent = this.selection.type == 'Text' ? this.range.parentElement() : this.selection.type == 'Control' ?  this.range.parentElement : null;
	
		if(parent && parent.ownerDocument != doc)
		{
			this.range = doc.body.createTextRange();
			this.range.collapse();
			this.range.select();
		}
	},
	
	// return the selected node (or the node containing the selection)
	getParentElement: function()
	{
        if(this.selection.type == 'Control')
		{
            return $(this.selection.createRange().item(0));
        }
		else
		{
            return $(this.selection.createRange().parentElement());
        }
    },
	
	replaceSelectionWithElement: function(el){
		// set an id to find pasted element again
		el.setProperty('id', 'editoo_past_element');
		this.selection.createRange().pasteHTML(el.outerHTML);
		el = $(this.document.getElementById('editoo_past_element'));
		el.removeProperty('id');
		return el;
	},
	
	moveToElementText: function(el)
	{
		this.range.moveToElementText(el.getChildNodes().item(0));
	},
	
	moveStart: function(unit, count)
	{
		this.range.moveStart(unit, count);
	},
	
	moveEnd: function(unit, count)
	{
		this.range.moveEnd(unit, count);
	}
});

Editoo.Range.MozillaWebkit = Editoo.Range.Base.extend(
{
	initialize: function(selection)
	{
		this.parent(selection);
	},
	
	// return the selected node (or the node containing the selection)
	getParentElement: function()
	{
		var parent;
        if(this.selection.rangeCount == 0)
		{
            parent = this.document.getDocument().body;
            while(parent.firstChild)
			{
                parent = parent.firstChild;
            }
        }
		else
		{
            var range = this.selection.getRangeAt(0);
            parent = range.commonAncestorContainer;

            // the following deals with cases where only a single child is selected, e.g. after a click on an image
            var inv = range.compareBoundaryPoints(Range.START_TO_END, range) < 0;
            var startNode = inv ? range.endContainer : range.startContainer;
            var startOffset = inv ? range.endOffset : range.startOffset;
            var endNode = inv ? range.startContainer : range.endContainer;
            var endOffset = inv ? range.startOffset : range.endOffset;

            var selectedChild = null;
            var child = parent.firstChild;
            while(child)
			{
                // the additional conditions catch some invisible intersections, but still not all of them
                if(range.intersectsNode(child) &&
                    !(child == startNode && startOffset == child.length) &&
                    !(child == endNode && endOffset == 0)){
                    if(selectedChild)
					{
                        // current child is the second selected child found
                        selectedChild = null;
                        break;
                    }
					else
					{
                        // current child is the first selected child found
                        selectedChild = child;
                    }
                }
				else if(selectedChild)
				{
                    // current child is after the selection
                    break;
                }
                child = child.nextSibling;
            }
            if(selectedChild)
			{
                parent = selectedChild;
            }
        }
        if(parent.nodeType == Node.TEXT_NODE)
		{
            parent = parent.parentNode;
        }
        return $(parent);
    },
	
	replaceSelectionWithElement: function(el)
	{
		var range = this.selection.getRangeAt(0);

        this.selection.removeAllRanges();

        range.deleteContents();
		
        var container = range.startContainer,
        	pos = range.startOffset,
			range = this.document.createRange();

        if(container.nodeType == 3 && el.nodeType == 3)
		{
            container.insertData(pos, el.nodeValue);
            range.setEnd(container, pos + el.length);
            range.setStart(container, pos + el.length);
        }
		else
		{
            var afterNode;
            if(container.nodeType == 3)
			{
                var textNode = container,
                	container = textNode.parentNode,
               		text = textNode.nodeValue,
                	textBefore = text.substr(0,pos),
                	textAfter = text.substr(pos),
					beforeNode = this.document.createTextNode(textBefore);
                
				afterNode = this.document.createTextNode(textAfter);

                container.insertBefore(afterNode, textNode);
                container.insertBefore(el, afterNode);
                container.insertBefore(beforeNode, el);

                container.removeChild(textNode);
            }
			else
			{
                afterNode = container.childNodes[pos];
                if(afterNode)
				{
                    container.insertBefore(el, afterNode);
                }
				else
				{
                    container.appendChild(el);
                }
            }

            range.setEnd(afterNode, 0);
            range.setStart(afterNode, 0);
        }
        return $(el);
	}
});

Editoo.Asset = Class.Merge(Asset, {
	
	css: function(source, doc)
	{
		doc = doc || document;
		var el = doc.createElement('link');
		try
		{
			el.setAttribute('href', source);
			el.setAttribute('type', 'text/css');
			el.setAttribute('rel', 'stylesheet');
			(doc.head || doc.getElementsByTagName('head')[0]).appendChild(el);
		}
		catch(e) { el = null }
	}
});