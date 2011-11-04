

//BUG: Nameless schema
//BUG: String default
//TODO: Support for readonly
//TODO: Fix the mess: field value id and field id
//TODO: Type could be array (!)
//TODO: Check if the property name already exist
//TODO: Remove the limitations for property name (support all kind of character)
//TODO: Deal with 'any'
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
//TODO: Rich class for items / properties: first and last, even and odd
//TODO: Support for measurement format (i.e.: value - unit compound)
//TODO: Support for combo requirement (e.g.: length + width + height or height + diameter)
//TODO: Support for compound (a field consisted of smaller obvious fields). For example measurement field consisted of value field and unit field.
//TODO: Support for more solid compound: URL or href is defined as field but could be break up to parts.
//TODO: Enum label (and description)
//TODO: Allow to replace wordings (e.g.: "Add property:")
//TODO: Use description as fallback of title (element's title should be only taken from title)
//TODO: Should support something like: { "type": "object", "properties": { "name": "string" } }. With `name` value is string with all default properties.
//TODO: Required: any (any field), combo (set of combination)
//TODO: Automatically add first array item if the item type is singular
//TODO: (non-)Exclusive enum
//TODO: Display character counter for string field if the length is constrained


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

onde.Onde = function (formId, schema, documentInst, opts) {
    var _inst = this;
    this.externalSchemas = {}; // A hash of cached external schemas. The key is the full URL of the schema.
    this.innerSchemas = {};
    this.fieldNamespaceSeparator = '.';
    this.fieldNamespaceSeparatorRegex = /\./g;
    this.formId = formId;
    this.documentSchema = schema;
    this.documentInstance = documentInst;
    // Object property adder
    $('#' + formId + ' .property-add').live('click', function (evt) {
        evt.preventDefault();
        _inst.onAddObjectProperty($(this));
    });
    // Array item adder
    $('#' + formId + ' .item-add').live('click', function (evt) {
        evt.preventDefault();
        _inst.onAddListItem($(this));
    });
    // Collapsible field (object and array)
    $('#' + formId + ' .collapsible').live('click', function (evt) {
        var fieldId = $(this).attr('data-field-id');
        if (fieldId && !$('#' + fieldId).hasClass('inline')) {
            $('#' + fieldId).slideToggle('fast');
/*            if (jQuery.fn.fadeToggle) {
                // jQuery 1.4.4
                $('#' + fieldId + '-edit-bar').fadeToggle('fast');
            } else { */
                $('#' + fieldId + '-edit-bar').slideToggle('fast');
/*            } */
            $(this).toggleClass('collapsed');
            //TODO: Display indicator (and/or summary) when collapsed
        }
    });
    // Field deleter (property and item)
    $('#' + formId + ' .field-delete').live('click', function (evt) {
        evt.preventDefault();
        evt.stopPropagation(); //CHECK: Only if collapsible
        console.log('#' + $(this).attr('data-id'));
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
    $('#' + formId + ' .field-type-select').live('change', function (evt) {
        evt.preventDefault();
        _inst.onFieldTypeChanged($(this));
    });
    $('#' + formId).live('submit', function (evt) {
        evt.preventDefault();
        var formData = {};
        var fields = $(this).serializeArray();
        for (var i = 0; i < fields.length; i++) {
            formData[fields[i].name] = fields[i].value;
        }
        if (formData.next) {
            delete formData.next;
        }
        var outData = _inst._buildObject(_inst.documentSchema, _inst.formId, formData);
        if (outData.errorCount) {
            //TODO: Show message (use content) and cancel submit
            alert("Error submitting data. Number of errors: " + outData.errorCount);
            console.log(outData);
        } else {
            //TODO: Submit the result
            //console.log(outData.data);
            $('#json-output').text(JSON.stringify(outData.data, null, "  "));
            $.post("http://localhost:29017/test/test/_insert", { data: JSON.stringify(outData.data) }, null, 'json');
        }
        return false;
    });
    $('#' + this.formId + ' .placeholder').show();
    $('#' + this.formId + ' .main').hide();
    $('#' + this.formId + ' .actions').hide();
};

onde.Onde.prototype.render = function (schema, data) {
    this.documentSchema = schema || this.documentSchema;
    if (!this.documentSchema) {
        //CHECK: Bail out or freestyle object?
    }
    this.documentInstance = data;
    var panel = $('#' + this.formId + ' .main');
    panel.empty();
    panel.hide();
    this.renderObject(this.documentSchema, panel, this.formId, this.documentInstance);
    panel.fadeIn();
    
    $('#' + this.formId + ' .actions').fadeIn();
    $('#' + this.formId + ' .placeholder').hide();
//    $('#' + this.formId + ' .main').append('<p><button type="submit" name="submit" value="dump_json">Get JSON</button></p>');
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
        if (schema.additionalProperties === true) {
            var firstItem = rowN ? false : true;
            //TODO: Check the type of the value
            for (var dKey in data) {
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
            //TODO: Validate the value
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
        var editBar = $('<div class="edit-bar object" id="' + fieldValueId + '-edit-bar"></div>');
        var inner = $('<small></small>');
        inner.append('Add property: ');
        inner.append('<input type="text" id="' + fieldValueId + '-key" placeholder="Property name" /> ');
        if (propertyTypes.length == 1) {
            var optInfo = propertyTypes[0];
            if (typeof optInfo == 'string') {
                //TODO: Validate the value
                inner.append(' <button class="field-add property-add" data-field-id="' + fieldValueId + '" data-object-namespace="' + namespace + '" data-object-type="' + optInfo + '">Add</button>');
            } else if (typeof optInfo == 'object') {
                if (optInfo instanceof Array) {
                    console.error("TODO: Array type is not supported");
                } else {
                    var optName = optInfo['name'];
                    var optText = null;
                    //TODO: More name validation
                    if (!optName) {
                        optName = 'schema-' + this._generateFieldId();
                        optText = optInfo['type']; //TODO: Check if already used
                    } else {
                        optText = optName;
                    }
                    this.innerSchemas[namespace + ':' + optName] = optInfo;
                    var optType = optInfo['type'];
                    //TODO: Check the type, it must be string and the value must be primitive
                    //TODO: Check the schema, it must have name property and the name must be 
                    // unique among other types in the same list (or one overwrites others).
                    inner.append(' <button class="field-add property-add" data-field-id="' + fieldValueId + '" data-object-namespace="' + namespace + '" data-object-type="' + optType + '" data-schema-name="' + optName + '">Add</button>');
                }
            }
        } else {
            var typeOptions = $('<select id="' + fieldValueId + '-type"></select> ');
            if (propertyTypes.length) {
                for (var iapt = 0; iapt < propertyTypes.length; ++iapt) {
                    var optInfo = propertyTypes[iapt];
                    if (typeof optInfo == 'string') {
                        typeOptions.append('<option>' + optInfo + '</option>');
                    } else if (typeof optInfo == 'object') {
                        if (optInfo instanceof Array) {
                            console.error("Error: array in type list");
                            continue;
                        }
                        if ('$ref' in optInfo) {
                            //TODO:FIXME:HACK
                            optInfo = this.getSchema(optInfo['$ref']);
                        }
                        var optName = optInfo['name'];
                        var optText = null;
                        //TODO: More name validation
                        if (!optName) {
                            optName = 'schema-' + this._generateFieldId();
                            optText = optInfo['type']; //TODO: Check if already used
                        } else {
                            optText = optName;
                        }
                        this.innerSchemas[namespace + ':' + optName] = optInfo;
                        var optType = optInfo['type'];
                        //TODO: Check the type, it must be string and the value must be primitive
                        //TODO: Check the schema, it must have name property and the name must be 
                        // unique among other types in the same list (or one overwrites others).
                        var optN = $('<option>' + optText + '</option>');
                        optN.attr('value', optType);
                        optN.attr('data-schema-name', optName);
                        typeOptions.append(optN);
                    } else {
                        console.error("Error: invalid type in type list");
                    }
                }
            } else {
                //TODO: Any type
                for (var ipt = 0; ipt < onde.PRIMITIVE_TYPES.length; ++ipt) {
                    typeOptions.append('<option>' + onde.PRIMITIVE_TYPES[ipt] + '</option>');
                }
            }
            inner.append(typeOptions);
            inner.append(' <button class="field-add property-add" data-field-id="' + fieldValueId + '" data-object-namespace="' + namespace + '">Add</button>');
        }
        editBar.append(inner);
        parentNode.append(editBar);
    }
    return objectId;
};


onde.Onde.prototype.renderEnumField = function (fieldName, fieldInfo, valueData) {
    //TODO: If the property is not required, show 'null' value
    //TODO: Select value or default if no data provided
    //TODO: If not exclusive, use combo box
    var fieldNode = null;
    if (fieldInfo && fieldInfo.enum) {
        var optn = null;
        fieldNode = $('<select id="fieldvalue-' + this._fieldNameToID(fieldName) + '" name="' + fieldName + '"></select>');
        if (!fieldInfo.required) {
            // The 'null' option
            fieldNode.append('<option value=""></option>');
        }
        for (var iev = 0; iev < fieldInfo.enum.length; iev++) {
            //TODO: Select the value
            optn = $('<option>' + fieldInfo.enum[iev] + '</option>');
            // Select the value if the data is valid
            if (typeof valueData == fieldInfo.type && fieldInfo.enum[iev] == valueData) {
                optn.attr('selected', 'selected');
            }
            fieldNode.append(optn);
        }
    }
    return fieldNode;
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
        if (itemTypes.length == 1) {
            var optInfo = itemTypes[0];
            if (typeof optInfo == 'string') {
                //TODO: Validate the value
                inner.append(' <button class="field-add item-add" data-field-id="' + fieldValueId + '" data-object-namespace="' + fieldName + '" data-object-type="' + optInfo + '" data-last-index="' + lastIndex + '">Add</button>');
            } else if (typeof optInfo == 'object') {
                if (optInfo instanceof Array) {
                    console.error("TODO: Array type is not supported");
                } else {
                    if ('$ref' in optInfo) {
                        //TODO:FIXME:HACK
                        optInfo = this.getSchema(optInfo['$ref']);
                    }
                    var optName = optInfo['name'];
                    var optText = null;
                    //TODO: More name validation
                    if (!optName) {
                        optName = 'schema-' + this._generateFieldId();
                        optText = optInfo['type']; //TODO: Check if already used
                    } else {
                        optText = optName;
                    }
                    this.innerSchemas[fieldName + ':' + optName] = optInfo;
                    var optType = optInfo['type'];
                    //TODO: Check the type, it must be string and the value must be primitive
                    //TODO: Check the schema, it must have name property and the name must be 
                    // unique among other types in the same list (or one overwrites others).
                    inner.append(' <button class="field-add item-add" data-field-id="' + fieldValueId + '" data-object-namespace="' + fieldName + '" data-object-type="' + optType + '" data-schema-name="' + optName + '" data-last-index="' + lastIndex + '">Add</button>');
                }
            }
        } else {
            var typeOptions = $('<select id="' + fieldValueId + '-type"></select> ');
            if (itemTypes.length) {
                for (var iapt = 0; iapt < itemTypes.length; ++iapt) {
                    var optInfo = itemTypes[iapt];
                    if (typeof optInfo == 'string') {
                        typeOptions.append('<option>' + optInfo + '</option>');
                    } else if (typeof optInfo == 'object') {
                        if (optInfo instanceof Array) {
                            console.error("Error: array in type list");
                            continue;
                        }
                        if ('$ref' in optInfo) {
                            //TODO:FIXME:HACK
                            optInfo = this.getSchema(optInfo['$ref']);
                        }
                        var optName = optInfo['name'];
                        var optText = null;
                        //TODO: More name validation
                        if (!optName) {
                            optName = 'schema-' + this._generateFieldId();
                            optText = optInfo['type']; //TODO: Check if already used
                        } else {
                            optText = optName;
                        }
                        this.innerSchemas[fieldName + ':' + optName] = optInfo;
                        var optType = optInfo['type'];
                        //TODO: Check the type, it must be string and the value must be primitive
                        //TODO: Check the schema, it must have name property and the name must be 
                        // unique among other types in the same list (or one overwrites others).
                        var optN = $('<option>' + optText + '</option>');
                        optN.attr('value', optType);
                        optN.attr('data-schema-name', optName);
                        typeOptions.append(optN);
                    } else {
                        console.error("Error: invalid type in type list");
                    }
                }
            } else {
                //TODO: Any type
                for (var ipt = 0; ipt < onde.PRIMITIVE_TYPES.length; ++ipt) {
                    typeOptions.append('<option>' + onde.PRIMITIVE_TYPES[ipt] + '</option>');
                }
            }
            inner.append(typeOptions);
            inner.append(' <button class="field-add item-add" data-field-id="' + fieldValueId + '" data-object-namespace="' + fieldName + '" data-last-index="' + lastIndex + '">Add</button>');
        }
        editBar.append(inner);
        parentNode.append(editBar);
        return;
    } else if (fieldInfo.type == '$ref: #') { //HACK
        this.renderObject(this.documentSchema, parentNode, fieldName, valueData);
    } else {
        var tdN = $('<span class="value">InternalError: Unsupported property type: <tt>' + fieldInfo.type + '</tt></span>');
        parentNode.append(tdN);
    }
};

onde.Onde.prototype.renderObjectPropertyField = function (namespace, baseId, fieldInfo, propName, valueData) {
    var fieldName = namespace + this.fieldNamespaceSeparator + propName;
    var fieldValueId = 'fieldvalue-' + this._fieldNameToID(fieldName);
    var collectionType = false;
    var rowN = $('<li></li>');
    fieldInfo = this._sanitizeFieldInfo(fieldInfo, valueData);
    if (!fieldInfo) {
        //TODO: Render the label first
        //TODO: Handle more cases
        rowN.append("SchemaError: Expect a valid property information. Got <strong><tt>" + fieldInfo + "</tt></strong>.");
        return rowN;
    }
    rowN.addClass('field');
    if (typeof fieldInfo.type == 'string') {
        if (fieldInfo.type._startsWith('$ref: ')) {
            rowN.addClass('object');
        } else {
            rowN.addClass(fieldInfo.type);
            collectionType = (fieldInfo.type == 'object' || fieldInfo.type == 'array');
        }
    }
    //rowN.addClass('property');
    //rowN.addClass(baseId + '-property');
    var labelN = $('<label for="' + fieldValueId + '"></label>');
    labelN.addClass('field-name');
    if ((fieldInfo.type == 'object' && fieldInfo.display != 'inline') || fieldInfo.type == 'array' || (typeof fieldInfo.type == 'string' && fieldInfo.type._startsWith('$ref: '))) {
        labelN.addClass('collapsible');
    }
    // Use the label if provided. Otherwise, use property name.
    var labelText = fieldInfo.label || propName;
    if (namespace === '' && this.documentSchema.primaryProperty && this.documentSchema.primaryProperty == propName) {
        labelN.append('<strong>' + labelText + '*: </strong>');
    } else {
        if (fieldInfo.required) {
            labelN.append(labelText + '*: ');
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
    if (labelN.hasClass('collapsible')) {
        //TODO: Description here
        var fieldDesc = fieldInfo.description || fieldInfo.title;
        if (fieldDesc) {
            labelN.append(' <small class="description"><em>' + fieldDesc + '</small></em>');
        }
    }
    rowN.append(labelN);
    if (fieldInfo['$ref']) {
        //TODO: Deal with schema reference
        rowN.append('<span class="value">' + fieldInfo['$ref'] + '</span>');
    } else {
        if (valueData && namespace === '' && this.documentSchema.primaryProperty == propName) {
            // Primary property is not editable
            rowN.append('<span class="value"><strong>' + valueData + '</strong></span>');
            rowN.append('<input type="hidden" name="' + fieldName + '" value="' + valueData + '" />');
        } else {
            this.renderFieldValue(fieldName, fieldInfo, rowN, valueData);
            labelN.attr('data-field-id', fieldValueId);
            rowN.attr('id', 'field-' + this._fieldNameToID(fieldName));
            if (!collectionType) {
                rowN.append(actionMenu);
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
    fieldInfo = this._sanitizeFieldInfo(fieldInfo, valueData);
    rowN.addClass('field');
    if (typeof fieldInfo.type == 'string') {
        if (fieldInfo.type._startsWith('$ref: ')) {
            rowN.addClass('object');
        } else {
            rowN.addClass(fieldInfo.type);
            collectionType = (fieldInfo.type == 'object' || fieldInfo.type == 'array');
        }
    }
    rowN.addClass('array-item');
    rowN.attr('id', 'field-' + this._fieldNameToID(fieldName));
    var deleterShown = false;
    var labelN = null;
    if (fieldInfo.type == 'object' && fieldInfo.display == 'inline') {
    } else {
        var labelN = $('<label for="' + fieldValueId + '"></label>');
        labelN.addClass('field-name');
        labelN.addClass('array-index');
        labelN.append('&nbsp;');
        if ((fieldInfo.type == 'object' && fieldInfo.display != 'inline') || fieldInfo.type == 'array') {
            labelN.addClass('collapsible');
        }
        //labelN.append(idat + ': ');
        labelN.append('&nbsp; ');
        //TODO: More actions (only if qualified)
        if (collectionType) {
            labelN.append('<small> <button class="field-delete" data-id="field-' + this._fieldNameToID(fieldName) + '" title="Delete item">delete</button> <small>');
            deleterShown = true;
        }
        rowN.append(labelN);
    }
    if (labelN) {
        labelN.attr('data-field-id', fieldValueId);
    }
    this.renderFieldValue(fieldName, fieldInfo, rowN, valueData);
    if (!deleterShown) {
        rowN.append('<small> <button class="field-delete" data-id="field-' + this._fieldNameToID(fieldName) + '" title="Delete item">delete</button> <small>');
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
    // Get the schema
    fieldInfo = this.innerSchemas[schemaName ? namespace + ':' + schemaName : namespace];
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
    // Get the schema
    fieldInfo = this.innerSchemas[schemaName ? namespace + ':' + schemaName : namespace];
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
