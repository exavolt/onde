

//BUG: Wrong ID for delete
//BUG: Nameless schema
//BUG: String default
//BUG: Handling bad schema for object
//TODO: Enum with single value is constant
//TODO: Fix the mess: field value id and field id
//TODO: Type could be array (!) i.e., union
//TODO: Check if the property name already exist
//TODO: Remove the limitations for property name (support all kind of character)
//TODO: Deal with 'any' (more consistenly)
//TODO: More consistent IDs
//TODO: Boolean value consistency
//TODO: Warning if the data doesn't conform the schema
//TODO: Collapse array / object panel if the data is empty and not required
//TODO: Collapse array / object panel if it's more than defined depth
//TODO: Add 'custom' class to additional properties and list items
//TODO: Can't just use 'object' and 'array' as type option. Must specify which definition.
//TODO: Support empty (null?) array item
//CHECK: Remove empty object and array?
//TODO: Nicer error reporting (for both rendering and data collecting)
//TODO: More treatments to multiline string
//TODO: Smart multiline (textarea) based on the format (and explicit schema property)
//TODO: Initially show the edit bars as semi transparent and make it opaque on hover
//TODO: Options: submit URL, delete URL, ...
//TODO: More than one level summary
//TODO: Rich element class for items / properties: first and last, even and odd
//TODO: Support for measurement format (i.e.: value - unit compound)
//TODO: Support for combo requirement (e.g.: length + width + height or height + diameter)
//TODO: Support for compound (a field consisted of smaller fields).
// For example measurement field consisted of value field and unit field.
//TODO: Support for more solid compound: URL or href is defined as field but could be break up to parts.
//TODO: Allow to replace wordings (e.g.: "Add property:")
// For "Add item", check that the item's schema has name
//TODO: Use description as fallback of title (element's title should be only taken from title)
//TODO: Should support something like: { "type": "object", "properties": { "name": "string" } }. With `name` value is string with all default properties.
//TODO: Required: any (any field), combo (set of combination)
//TODO: Automatically add first array item if the item type is singular
//TODO: (non-)Exclusive enum (use combobox or plain input with autocomplete)
//TODO: Display character counter for string field if the length is constrained
//TODO: Descriptive enum value. e.g., { "value": "the-real-value", "label": "Displayed text" }
//TODO: Add option: collapsed on load (interactively added items are always expanded)


/*FIXME: Monkey-patching is not recommended */

// Monkey-patch for browser with no Array.indexOf support
if (!Array.prototype.indexOf) {
    Array.prototype.indexOf = function(searchElement/*, fromIndex */) {
        "use strict";
        if (this === void 0 || this === null)
            throw new TypeError();
        var t = Object(this);
        var len = t.length >>> 0;
        if (len === 0)
            return -1;
        var n = 0;
        if (arguments.length > 0) {
            n = Number(arguments[1]);
            if (n !== n)
                n = 0;
            else if (n !== 0 && n !== (1 / 0) && n !== -(1 / 0))
                n = (n > 0 || -1) * Math.floor(Math.abs(n));
        }
        if (n >= len)
            return -1;
        var k = n >= 0 ? n : Math.max(len - Math.abs(n), 0);
        for (; k < len; k++) {
            if (k in t && t[k] === searchElement)
                return k;
        }
        return -1;
    };
}
// These two are nice things which JS misses so much
String.prototype._startsWith = function (prefix) {
    return this.lastIndexOf(prefix, 0) === 0;
};
String.prototype._endsWith = function (suffix) {
    return this.indexOf(suffix, this.length - suffix.length) !== -1;
};


var onde = (function () {
    return {
        simpleTypes: []
    };
})();

onde.PRIMITIVE_TYPES = ['string', 'number', 'integer', 'boolean', 'array', 'object'];
//onde.simpleTypes = ['string', 'number', 'integer', 'boolean', 'object', 'array', 'null', 'any'];

onde.Onde = function (formElement, schema, documentInst, opts) {
    var _inst = this;
    //this.options = opts;
    this.externalSchemas = {}; // A hash of cached external schemas. The key is the full URL of the schema.
    this.innerSchemas = {};
    this.fieldNamespaceSeparator = '.';
    this.fieldNamespaceSeparatorRegex = /\./g;
    this.formElement = $(formElement);
    this.panelElement = this.formElement.find('.onde-panel');
    this.documentSchema = schema;
    this.documentInstance = documentInst;
    // Object property adder
    this.panelElement.find('.property-add').live('click', function (evt) {
        evt.preventDefault();
        _inst.onAddObjectProperty($(this));
    });
    // Array item adder
    this.panelElement.find('.item-add').live('click', function (evt) {
        evt.preventDefault();
        _inst.onAddListItem($(this));
    });
    // Collapsible field (object and array)
    this.panelElement.find('.collapser').live('click', function (evt) {
        var collapser = $(this);
        var fieldId = collapser.attr('data-fieldvalue-container-id');
        //TODO: Check the field. It must not be inline.
        if (fieldId) {
            // Check the state first (for smoother animations)
            if (collapser.hasClass('collapsed')) {
                collapser.removeClass('collapsed');
                $('#' + fieldId).slideDown('fast');
            } else {
                //TODO: Display indicator (and/or summary) when collapsed
                $('#' + fieldId).slideUp('fast', function () {
                    collapser.addClass('collapsed');
                });
            }
        }
    });
    // Field deleter (property and item)
    this.panelElement.find('.field-delete').live('click', function (evt) {
        evt.preventDefault();
        evt.stopPropagation(); //CHECK: Only if collapsible
        //console.log('#' + $(this).attr('data-id'));
        $('#' + $(this).attr('data-id')).fadeOut('fast', function () {
            // Change the item's and siblings' classes accordingly
            //FIXME: This is unstable
            if ($(this).hasClass('first')) {
                $(this).next('li.field').addClass('first');
            }
            if ($(this).hasClass('last')) {
                $(this).prev('li.field').addClass('last');
            }
            $(this).remove();
        });
    });
    // Type selector
    this.panelElement.find('.field-type-select').live('change', function (evt) {
        evt.preventDefault();
        _inst.onFieldTypeChanged($(this));
    });
    //this.panelElement.hide();
};

onde.Onde.prototype.render = function (schema, data, opts) {
    this.documentSchema = schema || this.documentSchema;
    if (!this.documentSchema) {
        //CHECK: Bail out or freestyle object?
    }
    this.options = opts;
    this.documentInstance = data;
    this.panelElement.empty();
    //this.panelElement.hide();
    this.instanceId = this._generateFieldId();
    this.initialRendering = true;
    this.renderObject(this.documentSchema, this.panelElement, this.instanceId, this.documentInstance);
    this.initialRendering = false;
    //this.panelElement.show();
    if (opts.renderFinished) {
        opts.renderFinished(this.panelElement);
    }
};


onde.Onde.prototype.getSchema = function (schemaURL) {
    //TODO: Implement schema management
    return null;
};

onde.Onde.prototype.renderObject = function (schema, parentNode, namespace, data) {
    schema = schema || { type: "object", additionalProperties: true, _deletable: true };
    var props = schema.properties || {};
    var sortedKeys = [];
    if (false) {
        for (var propName in props) {
            // First filter, ignore properties not owned by the schema object
            if (!props.hasOwnProperty(propName)) {
                continue;
            }
            // Rule out primary property, if any, for now
            if (schema.primaryProperty && propName == schema.primaryProperty) {
                continue;
            }
            // Ignore properties used as object summary
            if (schema.summaryProperties && schema.summaryProperties.indexOf(propName) >= 0 && propName.indexOf(this.fieldNamespaceSeparator) < 0) {
                continue;
            }
            sortedKeys.push(propName);
        }
        // Sort the collected property names
        sortedKeys.sort();
        // Add object summary properties
        if (schema.summaryProperties) {
            for (var isp = schema.summaryProperties.length - 1; isp >= 0; --isp) {
                if (schema.primaryProperty && schema.summaryProperties[isp] == schema.primaryProperty) {
                    continue;
                }
                if (schema.summaryProperties[isp].indexOf(this.fieldNamespaceSeparator) >= 0) {
                    continue;
                }
                sortedKeys.unshift(schema.summaryProperties[isp]);
            }
        }
    } else {
        for (var propName in props) {
            if (props.hasOwnProperty(propName) && (!schema.primaryProperty || propName != schema.primaryProperty)) {
                if (sortedKeys.indexOf(propName) < 0) {
                    sortedKeys.push(propName);
                }
            }
        }
    }
    // Last property to be collected is the primary, if any.
    if (schema.primaryProperty) {
        sortedKeys.unshift(schema.primaryProperty);
    }
    if (schema['extends']) {
        for (var ixs = 0; ixs < schema['extends'].length; ++ixs) {
            var extSchema = this.getSchema(schema['extends'][ixs]);
            for (var propName in extSchema.properties) {
                if (propName in props) {
                } else {
                    props[propName] = extSchema.properties[propName];
                    sortedKeys.push(propName);
                }
            }
        }
    }
    var objectId = 'field-' + this._fieldNameToID(namespace);
    var fieldValueId = 'fieldvalue-' + this._fieldNameToID(namespace);
    var baseNode = $('<ul></ul>');
    baseNode.attr('data-type', 'object'); //CHECK: Always?
    if (schema.display) {
        baseNode.addClass(schema.display);
    }
    baseNode.attr('id', fieldValueId);
    // Render all the properties defined in the schema
    var rowN = null;
    for (var ik = 0; ik < sortedKeys.length; ik++) {
        var propName = sortedKeys[ik];
        var valueData = data ? data[propName] : null;
        var rowN = this.renderObjectPropertyField(namespace, objectId, 
            props[propName], propName, valueData);
        if (ik == 0) {
            rowN.addClass('first');
        }
        baseNode.append(rowN);
    }
    if (!schema.properties) {
        if (!('additionalProperties' in schema)) {
            schema.additionalProperties = true;
        }
    }
    // Now check if the object has additional properties
    if (schema.additionalProperties) {
        //NOTE: additionalProperties could have 4 types of value: boolean, 
        // string (the name of the type), object (type info), array of types.
        if (schema.additionalProperties === true) {
            var firstItem = rowN ? false : true;
            for (var dKey in data) {
                //NOTE: No need to check the types. Will be done by the inner renderers.
                // Take only additional items
                if (sortedKeys.indexOf(dKey) === -1) {
                    rowN = this.renderObjectPropertyField(namespace, objectId, 
                        { type: typeof data[dKey], additionalProperties: true, _deletable: true }, 
                        dKey, data[dKey]);
                    if (firstItem) {
                        rowN.addClass('first');
                        firstItem = false;
                    }
                    baseNode.append(rowN);
                }
            }
        } else {
            //TODO: Get the schema
        }
    }
    // Always the last if the object has any property
    if (rowN) {
        rowN.addClass('last');
    }
    parentNode.append(baseNode);
    var propertyTypes = [];
    // Gather the types available to additional properties
    if ('additionalProperties' in schema) {
        if (typeof schema.additionalProperties == 'string') {
            // Simply turn it into array (will be validated later)
            propertyTypes = [schema.additionalProperties];
        } else if (typeof schema.additionalProperties == 'object') {
            if (schema.additionalProperties instanceof Array) {
                propertyTypes = schema.additionalProperties;
            } else {
                propertyTypes = [schema.additionalProperties];
            }
        } else if (typeof schema.additionalProperties == 'boolean') {
            // Ignore (any?)
        } else {
            console.warn("Invalid additional properties type: " + (typeof schema.additionalProperties) + ".");
        }
    }
    // Toolbar if the object can has additional property
    if ('additionalProperties' in schema) {
        var editBar = $('<div class="edit-bar object"></div>');
        editBar.attr('id', fieldValueId + '-edit-bar');
        var inner = $('<small></small>');
        inner.append('Add property: ');
        inner.append('<input type="text" id="' + fieldValueId + '-key" placeholder="Property name" /> ');
        var addBtn = $('<button>Add</button>');
        addBtn.addClass('field-add').
            addClass('property-add');
        addBtn.attr('data-field-id', fieldValueId).
            attr('data-object-namespace', namespace);
        this.renderEditBarContent(propertyTypes, fieldValueId, inner, addBtn);
        inner.append(' ').append(addBtn);
        editBar.append(inner);
        parentNode.append(editBar);
    }
    return objectId;
};


onde.Onde.prototype.renderEnumField = function (fieldName, fieldInfo, valueData) {
    // Renders field with enum property set.
    // The field will be rendered as dropdown.
    //TODO: If not exclusive, use combo box
    var fieldNode = null;
    var selectedValue = null;
    var hasSelected = false;
    // First, check if there's any data provided.
    // If so, check if the enum has the same value
    // If so, save the information
    if (typeof valueData === fieldInfo.type && fieldInfo.enum.indexOf(valueData) >= 0) {
        selectedValue = valueData;
        hasSelected = true;
    }
    // If there's no data provided, or the data is not valid, 
    // try to get selected value from the default.
    if (!hasSelected && typeof fieldInfo['default'] === fieldInfo.type && fieldInfo.enum.indexOf(fieldInfo['default']) >= 0) {
        selectedValue = fieldInfo['default'];
        hasSelected = true;
    }
    if (fieldInfo && fieldInfo.enum) {
        var optN = null;
        fieldNode = $('<select id="fieldvalue-' + this._fieldNameToID(fieldName) + '" name="' + fieldName + '"></select>');
        if (!fieldInfo.required) {
            // Add the 'null' option if the field is not required
            fieldNode.append('<option value=""></option>');
        }
        for (var iev = 0; iev < fieldInfo.enum.length; iev++) {
            optN = $('<option>' + fieldInfo.enum[iev] + '</option>');
            // Select the value
            if (hasSelected && selectedValue == fieldInfo.enum[iev]) {
                optN.attr('selected', 'selected');
            }
            fieldNode.append(optN);
        }
    }
    return fieldNode;
};
onde.Onde.prototype.renderEditBarContent = function (typeList, fieldValueId, baseNode, controlNode) {
    if (typeList.length == 1) {
        var optInfo = typeList[0];
        if (typeof optInfo == 'string') {
            // Option is provided as simple string
            controlNode.attr('data-object-type', optInfo);
        } else if (typeof optInfo == 'object') {
            if (optInfo instanceof Array) {
                console.error("InternalError: Type list is not supported");
            } else {
                if ('$ref' in optInfo) {
                    // Replace the option info with the referenced schema
                    optInfo = this.getSchema(optInfo['$ref']);
                    if (!optInfo) {
                        console.error("SchemaError: Could not resolve referenced schema");
                    }
                }
                if (optInfo) {
                    var optType = optInfo['type'];
                    //TODO: Check the type, it must be string and the value must be primitive
                    var optText = optInfo['name'] || optType;
                    var optSchemaName = 'schema-' + this._generateFieldId();
                    this.innerSchemas[optSchemaName] = optInfo;
                    controlNode.attr('data-object-type', optType).
                        attr('data-schema-name', optSchemaName);
                }
            }
        }
    } else {
        // Render type list as type selector
        baseNode.append(this.renderTypeSelector(typeList, fieldValueId));
    }
}
onde.Onde.prototype.renderTypeSelector = function (typeList, fieldValueId) {
    // Renders type selector from type list.
    // This selector is for field (item or property) value is not restricted into one particular type.
    var typeOptions = $('<select id="' + fieldValueId + '-type"></select> ');
    if (typeList && typeList.length) {
        for (var iapt = 0; iapt < typeList.length; ++iapt) {
            var optInfo = typeList[iapt];
            if (typeof optInfo == 'string') {
                // The option is plain string, simply add it as an option.
                typeOptions.append('<option>' + optInfo + '</option>');
            } else if (typeof optInfo == 'object') {
                if (optInfo instanceof Array) {
                    // The option is an array.
                    console.error("SchemaError: Array in type list");
                    continue;
                }
                if ('$ref' in optInfo) {
                    // Replace the option info with the referenced schema
                    optInfo = this.getSchema(optInfo['$ref']);
                    if (!optInfo) {
                        console.error("SchemaError: Could not resolve referenced schema");
                        continue;
                    }
                }
                var optType = optInfo['type'];
                //TODO: Check the type, it must be string and the value must be primitive
                var optText = optInfo['name'] || optType;
                var optSchemaName = 'schema-' + this._generateFieldId();
                this.innerSchemas[optSchemaName] = optInfo;
                var optN = $('<option>' + optText + '</option>');
                optN.attr('value', optType);
                optN.attr('data-schema-name', optSchemaName);
                typeOptions.append(optN);
            } else {
                console.error("SchemaError: Invalid type in type list");
            }
        }
    } else {
        //TODO: Any type
        for (var ipt = 0; ipt < onde.PRIMITIVE_TYPES.length; ++ipt) {
            typeOptions.append('<option>' + onde.PRIMITIVE_TYPES[ipt] + '</option>');
        }
    }
    return typeOptions;
};

onde.Onde.prototype._sanitizeFieldInfo = function (fieldInfo, valueData) {
    if (typeof fieldInfo == 'string' || fieldInfo instanceof String) {
        return { type: fieldInfo }; //TODO: Type specific defaults
    }
    if ((!fieldInfo || !fieldInfo.type || fieldInfo.type == 'any') && valueData) {
        fieldInfo = fieldInfo || {};
        fieldInfo.type = typeof valueData;
        if (fieldInfo.type == 'object') {
            if (valueData instanceof Array) {
                fieldInfo.type = 'array';
            } else {
                fieldInfo.additionalProperties = true;
            }
        }
    }
    //TODO: Deal with array type
    return fieldInfo;
}

onde.Onde.prototype.renderFieldValue = function (fieldName, fieldInfo, parentNode, valueData) {
    //TODO: Allow schema-less render (with multiline string as the fallback)
    //TODO: Read-only
    //TODO: Schema ref
    var fieldValueId = 'fieldvalue-' + this._fieldNameToID(fieldName);
    if ('$ref' in fieldInfo) {
        console.log(filedInfo);
    }
    fieldInfo = this._sanitizeFieldInfo(fieldInfo, valueData);
    var fieldDesc = fieldInfo ? fieldInfo.description || fieldInfo.title : null;
    if (!fieldInfo || !fieldInfo.type || fieldInfo.type == 'any') {
        //TODO: Any!
        if (!fieldInfo) {
            parentNode.append("InternalError: Missing field information");
        } else if (!fieldInfo.type) {
            parentNode.append("InternalError: Missing type property");
        } else {
            parentNode.append("InternalError: Type of 'any' is currently not supported");
        }
    } else if (fieldInfo.type == 'string') {
        if (fieldInfo.readonly) {
            valueData = fieldInfo.value;
        }
        // String property
        var tdN = $('<span class="value"></span>');
        var fieldNode = null;
        if (fieldInfo && fieldInfo.enum) {
            fieldNode = this.renderEnumField(fieldName, fieldInfo, valueData);
        } else {
            //TODO: Format
            if (fieldInfo && fieldInfo.format == 'multiline') {
                fieldNode = $('<textarea id="' + fieldValueId + '" name="' + fieldName + '" class="value-input"></textarea>');
                if (typeof valueData == 'string') {
                    fieldNode.val(valueData);
                }
            } else {
                fieldNode = $('<input id="' + fieldValueId + '" type="text" name="' + fieldName + '" class="value-input" />');
                if (typeof valueData == 'string') {
                    fieldNode.val(valueData);
                }
            }
            if (fieldInfo && fieldInfo.title) {
                fieldNode.attr('title', fieldInfo.title);
            }
            if (fieldInfo['default']) {
                //TODO: Check the type
                fieldNode.attr('placeholder', fieldInfo['default']);
            }
            /*if (fieldInfo.format) {
                fieldNode.addClass(fieldInfo.format);
            }*/
        }
        fieldNode.attr('data-type', fieldInfo.type);
        if (fieldInfo.readonly) {
            fieldNode.attr('readonly', 'readonly');
        }
        tdN.append(fieldNode);
        if (fieldDesc) {
            tdN.append(' <small class="description"><em>' + fieldDesc + '</em></small>');
        }
        parentNode.append(tdN);
    } else if (fieldInfo.type == 'number' || fieldInfo.type == 'integer') {
        // Numeric property (number or integer)
        var tdN = $('<span class="value"></span>');
        var fieldNode = null;
        if (fieldInfo && fieldInfo.enum) {
            fieldNode = this.renderEnumField(fieldName, fieldInfo, valueData);
        } else {
            fieldNode = $('<input id="' + fieldValueId + '" type="text" name="' + fieldName + '" class="value-input" />');
            if (typeof valueData == "number") {
                fieldNode.val(valueData);
            } else if (typeof valueData == "string") {
                if (fieldInfo.type == 'integer') {
                    fieldNode.val(parseInt(valueData));
                } else {
                    fieldNode.val(parseFloat(valueData));
                }
            }
            if (fieldInfo.title) {
                fieldNode.attr('title', fieldInfo.title);
            }
            if (fieldInfo['default']) {
                //TODO: Check the type
                fieldNode.attr('placeholder', fieldInfo['default']);
            }
        }
        fieldNode.attr('data-type', fieldInfo.type);
        tdN.append(fieldNode);
        if (fieldDesc) {
            tdN.append(' <small class="description"><em>' + fieldDesc + '</em></small>');
        }
        parentNode.append(tdN);
    } else if (fieldInfo.type == 'boolean') {
        // Boolean property
        var tdN = $('<span class="value"></span>');
        //TODO: Check box (allow value replacements/mapping)
        var fieldNode = $('<input id="' + fieldValueId + '" type="checkbox" name="' + fieldName + '" class="value-input" />');
        if (valueData === true || valueData === 'true' || valueData === 1 || valueData === '1') {
            fieldNode.attr('checked', 'checked');
        }
        if (fieldInfo) {
            if (fieldInfo.title) {
                fieldNode.attr('title', fieldInfo.title);
            }
            if ('default' in fieldInfo && fieldInfo['default']) {
                fieldNode.attr('checked', 'checked');
            }
        }
        fieldNode.attr('data-type', fieldInfo.type);
        tdN.append(fieldNode);
        if (fieldDesc) {
            tdN.append(' <small class="description"><em>' + fieldDesc + '</em></small>');
        }
        parentNode.append(tdN);
    } else if (fieldInfo.type == 'object') {
        //if (fieldInfo.additionalItems) {
        //  this.innerSchemas[fieldName] = fieldInfo;
        //}
        this.renderObject(fieldInfo, parentNode, fieldName, valueData);
    } else if (fieldInfo.type == 'array') {
        //TODO:FIXME:HACK:TEMP: Dummy array item (should make the renderer understands different kind of fieldInfo types)
        var itemSchema = { "type": "any" };
        var contN = $('<ol id="' + fieldValueId + '" start="0"></ol>');
        contN.attr('data-type', 'array');
        var lastIndex = 0;
        if (valueData) {
            for (var idat = 0; idat < valueData.length; idat++) {
                lastIndex++;
                var chRowN = this.renderListItemField(fieldName, itemSchema, lastIndex, valueData[idat]);
                if (idat == 0) {
                    chRowN.addClass('first');
                }
                if (idat == valueData.length - 1) {
                    chRowN.addClass('last');
                }
                contN.append(chRowN);
            }
        }
        parentNode.append(contN);
        var itemTypes = [];
        // Gather the types available to items
        if ('items' in fieldInfo) {
            if (typeof fieldInfo.items == 'string') {
                //TODO: Validate the value
                itemTypes = [fieldInfo.items];
            } else if (typeof fieldInfo.items == 'object') {
                if (fieldInfo.items instanceof Array) {
                    itemTypes = fieldInfo.items;
                } else {
                    itemTypes = [fieldInfo.items];
                }
            } else {
                console.warn("Invalid items type: " + (typeof fieldInfo.items) + " (" + fieldName + ")");
            }
        }
        var editBar = $('<div class="edit-bar array" id="' + fieldValueId + '-edit-bar"></div>');
        var inner = $('<small></small>');
        inner.append('Add item: ');
        var addBtn = $('<button>Add</button>');
        addBtn.addClass('field-add').
            addClass('item-add');
        addBtn.attr('data-field-id', fieldValueId).
            attr('data-object-namespace', fieldName).
            attr('data-last-index', lastIndex);
        this.renderEditBarContent(itemTypes, fieldValueId, inner, addBtn);
        inner.append(' ').append(addBtn);
        editBar.append(inner);
        parentNode.append(editBar);
        return;
    } else {
        var tdN = $('<span class="value">InternalError: Unsupported property type: <tt>' + fieldInfo.type + '</tt></span>');
        parentNode.append(tdN);
    }
};

onde.Onde.prototype.renderObjectPropertyField = function (namespace, baseId, fieldInfo, propName, valueData) {
    var fieldName = namespace + this.fieldNamespaceSeparator + propName;
    var fieldValueId = 'fieldvalue-' + this._fieldNameToID(fieldName);
    var fieldType = null;
    var collectionType = false;
    var rowN = $('<li></li>');
    rowN.attr('id', 'field-' + this._fieldNameToID(fieldName));
    fieldInfo = this._sanitizeFieldInfo(fieldInfo, valueData);
    rowN.addClass('field');
    if (fieldInfo) {
        //TODO: Support schema reference
        //TODO: Other types of type
        if (typeof fieldInfo == 'string') {
            fieldType = fieldInfo;
            fieldInfo = {};
        } else if (typeof fieldInfo == 'object') {
            if (fieldInfo instanceof Array) {
                //TODO: Union
            } else if (typeof fieldInfo.type == 'string') {
                fieldType = fieldInfo.type;
            } else {
                console.warn("Invalid field info type: " + fieldInfo.type);
            }
        } else {
            console.warn("Invalid field info type: " + (typeof fieldInfo.type));
        }
    } else {
        fieldInfo = {};
    }
    if (onde.PRIMITIVE_TYPES.indexOf(fieldType) >= 0) {
        rowN.addClass(fieldType);
    } else {
        rowN.addClass('ref');
    }
    collectionType = (fieldType == 'object' || fieldType == 'array');
    //rowN.addClass('property');
    //rowN.addClass(baseId + '-property');
    var labelN = $('<label for="' + fieldValueId + '"></label>');
    rowN.append(labelN);
    labelN.addClass('field-name');
    var valN = null;
    if ((fieldType == 'object' && fieldInfo.display != 'inline') || fieldType == 'array') {
        // Some special treatments for collapsible field
        rowN.addClass('collapsible');
        labelN.addClass('collapser');
        labelN.attr('data-fieldvalue-container-id', 'fieldvalue-container-' + this._fieldNameToID(fieldName));
        valN = $('<div class="collapsible-panel"></div>');
        valN.addClass('fieldvalue-container');
        valN.attr('id', 'fieldvalue-container-' + this._fieldNameToID(fieldName));
        rowN.append(valN);
        if (this.initialRendering && this.options.collapsedCollapsibles) {
            valN.hide();
            labelN.addClass('collapsed');
        }
    } else {
        valN = rowN;
    }
    // Use the label if provided. Otherwise, use property name.
    var labelText = fieldInfo.label || propName;
    if (namespace === '' && this.documentSchema.primaryProperty && this.documentSchema.primaryProperty == propName) {
        labelN.append('<strong>' + labelText + '<span class="required-marker" title="Required field">*</span>: </strong>');
    } else {
        if (fieldInfo.required) {
            labelN.append(labelText + '<span class="required-marker" title="Required field">*</span>: ');
        } else {
            labelN.append(labelText + ': ');
        }
    }
    var actionMenu = '';
    //TODO: More actions (only if qualified)
    if (fieldInfo._deletable) {
        actionMenu = '<small> <button class="field-delete" data-id="field-' + this._fieldNameToID(fieldName) + '" title="Delete property">delete</button> <small>';
    }
    if (collectionType) {
        labelN.append(actionMenu);
    }
    if (labelN.hasClass('collapser')) {
        // Add description to label if the field is collapsible
        var fieldDesc = fieldInfo.description || fieldInfo.title;
        if (fieldDesc) {
            labelN.append(' <small class="description"><em>' + fieldDesc + '</small></em>');
        }
    }
    if (fieldInfo['$ref']) {
        //TODO: Deal with schema reference
        valN.append('<span class="value">' + fieldInfo['$ref'] + '</span>');
    } else if (onde.PRIMITIVE_TYPES.indexOf(fieldType) < 0) {
        //TODO: Deal with schema reference (and unsupported types)
        valN.append('<span class="value">' + fieldType + '</span>');
    } else {
        if (valueData && namespace === '' && this.documentSchema.primaryProperty == propName) {
            // Primary property is not editable
            valN.append('<span class="value"><strong>' + valueData + '</strong></span>');
            valN.append('<input type="hidden" name="' + fieldName + '" value="' + valueData + '" />');
        } else {
            this.renderFieldValue(fieldName, fieldInfo, valN, valueData);
            if (!collectionType) {
                valN.append(actionMenu);
            }
        }
    }
    return rowN;
};

onde.Onde.prototype.renderListItemField = function (namespace, fieldInfo, index, valueData) {
    var itemId = index;
    var fieldName = namespace + '[' + itemId + ']';
    var fieldValueId = 'fieldvalue-' + this._fieldNameToID(fieldName);
    var collectionType = false;
    var rowN = $('<li></li>');
    rowN.attr('id', 'field-' + this._fieldNameToID(fieldName));
    fieldInfo = this._sanitizeFieldInfo(fieldInfo, valueData);
    rowN.addClass('field');
    if (typeof fieldInfo.type == 'string') {
        rowN.addClass(fieldInfo.type);
        collectionType = (fieldInfo.type == 'object' || fieldInfo.type == 'array');
    }
    rowN.addClass('array-item');
    var deleterShown = false;
    var labelN = null;
    var valN = rowN;
    if (fieldInfo.type == 'object' && fieldInfo.display == 'inline') {
    } else {
        var labelN = $('<label for="' + fieldValueId + '"></label>');
        rowN.append(labelN);
        labelN.addClass('field-name');
        labelN.addClass('array-index');
        labelN.append('&nbsp;');
        if ((fieldInfo.type == 'object' && fieldInfo.display != 'inline') || fieldInfo.type == 'array') {
            rowN.addClass('collapsible');
            labelN.addClass('collapser');
            valN = $('<div class="collapsible-panel"></div>');
            valN.addClass('fieldvalue-container');
            valN.attr('id', 'fieldvalue-container-' + this._fieldNameToID(fieldName));
            rowN.append(valN);
            if (this.initialRendering && this.options.collapsedCollapsibles) {
                valN.hide();
                labelN.addClass('collapsed');
            }
        }
        //labelN.append(idat + ': ');
        labelN.append('&nbsp; ');
        //TODO: More actions (only if qualified)
        if (collectionType) {
            labelN.append('<small> <button class="field-delete" data-id="field-' + this._fieldNameToID(fieldName) + '" title="Delete item">delete</button> <small>');
            deleterShown = true;
        }
    }
    if (rowN.hasClass('collapsible') && labelN) {
        labelN.attr('data-fieldvalue-container-id', 'fieldvalue-container-' + this._fieldNameToID(fieldName));
    }
    this.renderFieldValue(fieldName, fieldInfo, valN, valueData);
    if (!deleterShown) {
        valN.append('<small> <button class="field-delete" data-id="field-' + this._fieldNameToID(fieldName) + '" title="Delete item">delete</button> <small>');
    }
    return rowN;
};


onde.Onde.prototype.onAddObjectProperty = function (handle) {
    //TODO: Check if the key already used
    var baseId = handle.attr('data-field-id');
    var propName = $('#' + baseId + '-key').val();
    if (!propName) {
        //TODO: Nice [unobstrusive] error message
        return;
    }
    if (!propName.match(/^[a-z_][a-z0-9_]+$/i)) {
        return;
    }
    var namespace = handle.attr('data-object-namespace');
    var ftype = handle.attr('data-object-type') || $('#' + baseId + '-type').val();
    var fieldInfo = null;
    var schemaName = null;
    var typeSel = $('#' + baseId + '-type');
    if (typeSel.length) {
        typeSel = typeSel[0];
        if (typeSel.options) {
            // The type is from a selection
            schemaName = $(typeSel.options[typeSel.selectedIndex]).attr('data-schema-name');
        } else {
            // Single type
            schemaName = typeSel.attr('data-schema-name');
        }
    }
    if (!schemaName) {
        // The last possible place to get the name of the schema
        schemaName = handle.attr('data-schema-name');
    }
    if (schemaName) {
        // Get the schema
        fieldInfo = this.innerSchemas[schemaName];
    }
    if (!fieldInfo) {
        // No schema found, build it
        fieldInfo = { type: ftype, _deletable: true };
        if (ftype == 'object') {
            // Special case for object, add additional property
            fieldInfo['additionalProperties'] = true;
        }
    } else {
        // Mark as deletable
        fieldInfo._deletable = true;
    }
    var baseNode = $('#' + baseId);
    var rowN = this.renderObjectPropertyField(namespace, baseId, fieldInfo, propName);
    var siblings = baseNode.children('li.field'); //NOTE: This may weak
    if (siblings.length == 0) {
        rowN.addClass('first');
    }
    siblings.removeClass('last');
    rowN.addClass('last');
    baseNode.append(rowN);
    $('#' + baseId + '-key').val('');
    rowN.hide();
    rowN.fadeIn('fast', function () { rowN.find('input').first().focus(); });
};

onde.Onde.prototype.onAddListItem = function (handle) {
    var baseId = handle.attr('data-field-id');
    var lastIndex = parseInt(handle.attr('data-last-index')) + 1;
    handle.attr('data-last-index', lastIndex);
    var namespace = handle.attr('data-object-namespace');
    var ftype = handle.attr('data-object-type') || $('#' + baseId + '-type').val();
    var fieldInfo = null;
    var schemaName = null;
    var typeSel = $('#' + baseId + '-type');
    if (typeSel.length) {
        typeSel = typeSel[0];
        if (typeSel.options) {
            // The type is from a selection
            schemaName = $(typeSel.options[typeSel.selectedIndex]).attr('data-schema-name');
        } else {
            // Single type
            schemaName = typeSel.attr('data-schema-name');
        }
    }
    if (!schemaName) {
        // The last possible place to get the name of the schema
        schemaName = handle.attr('data-schema-name');
    }
    if (schemaName) {
        // Get the schema
        fieldInfo = this.innerSchemas[schemaName];
    }
    if (!fieldInfo) {
        // No schema found, build it
        fieldInfo = { type: ftype };
        if (ftype == 'object') {
            // Special case for object, add additional property
            fieldInfo['additionalProperties'] = true;
        }
    }
    // Array item is always deletable (?!)
    var baseNode = $('#' + baseId);
    var rowN = this.renderListItemField(namespace, fieldInfo, lastIndex);
    var siblings = baseNode.children('li.array-item');
    if (siblings.length == 0) {
        rowN.addClass('first');
    }
    siblings.removeClass('last');
    rowN.addClass('last');
    baseNode.append(rowN);
    $('#' + baseId + '-key').val('');
    rowN.hide();
    rowN.fadeIn('fast', function () { rowN.find('input').first().focus(); });
};

onde.Onde.prototype.onFieldTypeChanged = function (handle) {
    //TODO
    //this.renderFieldValue(handle.attr('name'), { type: handle.val(), items: { type: 'string' } }, handle.parent());
};

onde.Onde.prototype._generateFieldId = function () {
    return 'f' + parseInt(Math.random() * 1000000);
};
onde.Onde.prototype._fieldNameToID = function (fieldName) {
    // Replace dots with hyphens
    //TODO: Replace all other invalid characters for HTML element ID.
    var t = fieldName.replace(/\./g, '-');
    return t.replace(/\[/g, '_').replace(/\]/g, '');
};


onde.Onde.prototype._buildProperty = function (propName, propInfo, path, formData) {
    var result = { data: null, noData: true, errorCount: 0, errorData: null };
    var fieldName = path + this.fieldNamespaceSeparator + propName;
    var ptype = 'any';
    if (propInfo && propInfo.type) {
        ptype = propInfo.type;
    }
    var dataType = ptype;
    if (ptype == 'any') {
        var fvn = $('#fieldvalue-' + this._fieldNameToID(fieldName));
        if (fvn.length) {
            dataType = fvn.attr('data-type');
        }
        if (!dataType || dataType == 'any') {
            console.log(propName);
            //TODO: Fallback: string?
            //TODO: Need to attach the type to the field for array and object
        }
    }
    if (dataType == 'object') {
        result = this._buildObject(propInfo, fieldName, formData);
    } else if (dataType == 'array') {
        var itemIndices = [];
        var baseFieldName = fieldName + '[';
        //NOTE: Here we rely on the object properties ordering (TODO: more reliable array ordering)
        // We use object to create an array with unique items (a set)
        var tmpIdx = {};
        for (var fname in formData) {
            if (fname._startsWith(baseFieldName)) {
                tmpIdx[fname.slice(baseFieldName.length).split(']', 1)[0]] = true;
            }
        }
        for (var fname in tmpIdx) {
            itemIndices.push(parseInt(fname));
        }
        itemIndices = itemIndices.sort(function (a,b) {return a - b});
        var lsData = [];
        var lsErrCount = 0;
        var lsErrData = [];
        for (var iidx = 0; iidx < itemIndices.length; ++iidx) {
            var cRes = this._buildProperty(propName + '[' + itemIndices[iidx] + ']', propInfo ? propInfo.items : null, path, formData);
            lsData.push(cRes.data);
            if (cRes.errorCount) {
                lsErrCount += cRes.errorCount;
                lsErrData.push(cRes.errorData);
            }
        }
        result.data = lsData;
        result.noData = false;
        if (lsErrCount) {
            result.errorCount += lsErrCount;
            result.errorData = lsErrData;
        }
    } else {
        var valData = null;
        if (formData) {
            valData = formData[fieldName];
        }
        if (dataType == 'boolean') {
            if (valData === true || valData === 'true' || valData === 'on') { //TODO: More qualifications
                result.data = true;
                result.noData = false;
            } else if (propInfo.required) {
                result.data = false;
                result.noData = false;
            }
        } else {
            //if (!valData) {
            //    console.log(fieldName + " " + dataType);
            //}
            //TODO: Guards
            if (valData) {
                result.noData = false;
                if (dataType == 'integer') {
                    result.data = parseInt(valData);
                } else if (dataType == 'number') {
                    result.data = parseFloat(valData);
                } else if (dataType == 'integer') {
                    result.data = parseInt(valData);
                } else if (dataType == 'string') {
                    result.data = valData;
                } else { //TODO: More types
                    console.warn("Unsupported type: " + dataType + " (" + fieldName + ")");
                    result.errorCount += 1;
                    result.errorData = 'type-error';
                }
            } else {
                if (propInfo && propInfo.required) {
                    result.errorCount += 1;
                    result.errorData = 'value-error';
                }
                if (!propInfo) {
                    console.log(fieldName);
                }
            }
        }
    }
    return result;
};

onde.Onde.prototype._buildObject = function (schema, path, formData) {
    var result = { data: {}, errorCount: 0, errorData: {} };
    var props = schema ? schema.properties || {} : {};
    for (var propName in props) {
        var propInfo = props[propName];
        var cRes = this._buildProperty(propName, propInfo, path, formData);
        if (!cRes.noData) {
            result.data[propName] = cRes.data;
        }
        if (cRes.errorCount) {
            result.errorCount += cRes.errorCount;
            result.errorData[propName] = cRes.errorData;
        }
    }
    if (!schema || schema.additionalProperties) {
        //TODO: Validate againts schema for additional properties
        var cpath = path + this.fieldNamespaceSeparator;
        for (var fieldName in formData) {
            var dVal = formData[fieldName];
            if (!dVal) {
                continue;
            }
            // Filter the form data
            if (fieldName._startsWith(cpath)) {
                var propName = fieldName.slice(cpath.length);
                var dataType = null;
                var dotIdx = propName.indexOf(this.fieldNamespaceSeparator);
                var brkIdx = propName.indexOf('[');
                if (dotIdx > 0 && brkIdx > 0) {
                    dataType = (dotIdx < brkIdx) ? 'object' : 'array';
                } else if (dotIdx > 0) {
                    dataType = 'object';
                } else if (brkIdx > 0) {
                    dataType = 'array';
                }
                if (dataType === 'object') {
                    var bPropName = propName.split(this.fieldNamespaceSeparator, 1)[0];
                    if (!(bPropName in result.data)) {
                        var cRes = this._buildProperty(bPropName, { type: 'object', additionalProperties: true }, path, formData);
                        if (!cRes.noData) {
                            result.data[bPropName] = cRes.data;
                        }
                        if (cRes.errorCount) {
                            result.errorCount += cRes.errorCount;
                            result.errorData[bPropName] = cRes.errorData;
                        }
                    }
                } else if (dataType === 'array') {
                    var bPropName = propName.split('[', 1)[0];
                    if (!(bPropName in result.data)) {
                        var cRes = this._buildProperty(bPropName, { type: 'array' }, path, formData);
                        if (!cRes.noData) {
                            result.data[bPropName] = cRes.data;
                        }
                        if (cRes.errorCount) {
                            result.errorCount += cRes.errorCount;
                            result.errorData[bPropName] = cRes.errorData;
                        }
                    }
                } else {
                    // Get the type from the element
                    dataType = $('#fieldvalue-' + this._fieldNameToID(fieldName)).attr('data-type');
                    if (dataType == 'number') {
                        dVal = parseFloat(dVal); //TODO: Guard
                    } else if (dataType == 'integer') {
                        dVal = parseInt(dVal); //TODO: Guard
                    } else if (dataType == 'boolean') {
                        //TODO: Guard
                        dVal = (dVal == 'on' || dVal == 'true' || dVal == 'checked' || dVal !== 0 || dVal === true);
                    } else if (dataType == 'string') {
                    } else {
                        console.warn("Unsupported type: " + dataType + " (" + fieldName + ")");
                        dVal = null; //CHECK: Null it?
                        //TODO: Guard
                        result.errorCount += 1;
                        result.errorData[propName] = 'type-error';
                    }
                    result.data[propName] = dVal;
                }
            }
        }
    }
    return result;
};

onde.Onde.prototype.getData = function () {
    var formData = {};
    var fields = this.formElement.serializeArray();
    for (var i = 0; i < fields.length; i++) {
        formData[fields[i].name] = fields[i].value;
    }
    if (formData.next) {
        delete formData.next;
    }
    return this._buildObject(this.documentSchema, this.instanceId, formData);
};
