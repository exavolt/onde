
//TODO: Fix the mess: field value id and field id
//TODO: Type could be array (!)
//TODO: Check if the property key already exist
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

//onde.simpleTypes = ['string', 'number', 'integer', 'boolean', 'object', 'array', 'null', 'any'];

onde.Onde = function (formId, schema, documentInst) {
    var _inst = this;
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
        $('#' + $(this).attr('data-id')).fadeOut('fast', function () { $(this).remove(); });
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
            //TODO: Show message and cancel submit
            alert("Number of errors: " + outData.errorCount);
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
    if (schema) {
        this.documentSchema = schema;
    }
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


onde.Onde.prototype.renderObject = function (schema, parentNode, namespace, data) {
    if (!schema) {
        schema = { type: "object", additionalProperties: true, _deletable: true };
    }
    var props = schema.properties || {};
    var sortedKeys = [];
    for (var propName in props) {
        if (!props.hasOwnProperty(propName)) {
            continue;
        }
        if (schema.primaryProperty && propName == schema.primaryProperty) {
            continue;
        }
        if (schema.summaryProperties && schema.summaryProperties.indexOf(propName) >= 0 && propName.indexOf('.') < 0) {
            continue;
        }
        sortedKeys.push(propName);
    }
    sortedKeys.sort();
    if (schema.summaryProperties) {
        for (var isp = schema.summaryProperties.length - 1; isp >= 0; --isp) {
            if (schema.primaryProperty && schema.summaryProperties[isp] == schema.primaryProperty) {
                continue;
            }
            if (schema.summaryProperties[isp].indexOf('.') >= 0) {
                continue;
            }
            sortedKeys.unshift(schema.summaryProperties[isp]);
        }
    }
    if (schema.primaryProperty) {
        sortedKeys.unshift(schema.primaryProperty);
    }
    var objectId = 'field-' + this._fieldNameToID(namespace);
    var fieldValueId = 'fieldvalue-' + this._fieldNameToID(namespace);
    var baseNode = $('<ul></ul>');
    baseNode.attr('data-type', 'object'); //CHECK: Always?
    if (schema.display) {
        baseNode.addClass(schema.display);
    }
    baseNode.attr('id', fieldValueId);
    for (var ik = 0; ik < sortedKeys.length; ik++) {
        var propName = sortedKeys[ik];
        var valueData = null;
        if (data) {
            valueData = data[propName];
        }
        baseNode.append(this.renderObjectPropertyField(namespace, objectId, 
            props[propName], propName, valueData));
    }
    if (schema.additionalProperties) {
        if (schema.additionalProperties === true) {
            //TODO: Only the custom data
            //TODO: Check the type of the value
            for (var dKey in data) {
                if (sortedKeys.indexOf(dKey) === -1) {
                    baseNode.append(this.renderObjectPropertyField(namespace, objectId, 
                        { type: typeof data[dKey], additionalProperties: true, _deletable: true }, dKey, data[dKey]));
                }
            }
        } else {
            //TODO: Get the schema
        }
    }
    parentNode.append(baseNode);
    if (schema.additionalProperties) {
        var editBar = $('<div class="edit-bar object" id="' + fieldValueId + '-edit-bar"></div>');
        var inner = $('<small></small>');
        inner.append('Add property: ');
        inner.append('<input type="text" id="' + fieldValueId + '-key" placeholder="Property name" /> ');
        var typeOptions = $('<select id="' + fieldValueId + '-type"></select> ');
        if (typeof schema.additionalProperties === 'object') {
            if ('$ref' in schema.additionalProperties) {
                typeOptions.append('<option>$ref: ' + schema.additionalProperties['$ref'] + '</option>');
            }
        } else {
            typeOptions.append('<option>string</option>');
            typeOptions.append('<option>number</option>');
            typeOptions.append('<option>integer</option>');
            typeOptions.append('<option>boolean</option>');
            typeOptions.append('<option>object</option>');
            typeOptions.append('<option>array</option>');
        }
        inner.append(typeOptions);
        inner.append('<a href="" class="property-add" data-field-id="' + fieldValueId + '" data-object-namespace="' + namespace + '">Add</a>');
        editBar.append(inner);
        parentNode.append(editBar);
    }
    return objectId;
};


onde.Onde.prototype.renderEnumField = function (fieldName, fieldInfo, valueData) {
    //TODO: If the property is not required, show 'null' value
    var fieldNode = null;
    if (fieldInfo && fieldInfo.enum) {
        var optn = null;
        fieldNode = $('<select id="fieldvalue-' + this._fieldNameToID(fieldName) + '" name="' + fieldName + '"></select>');
        for (var iev = 0; iev < fieldInfo.enum.length; iev++) {
            //TODO: Select the value
            optn = $('<option>' + fieldInfo.enum[iev] + '</option>');
            if (typeof valueData == fieldInfo.type && fieldInfo.enum[iev] == valueData) {
                optn.attr('selected', 'selected');
            }
            fieldNode.append(optn);
        }
    }
    return fieldNode;
};

onde.Onde.prototype._sanitizeFieldInfo = function (fieldInfo, valueData) {
    if ((!fieldInfo || !fieldInfo.type || fieldInfo.type == 'any') && valueData) {
        if (!fieldInfo) {
            fieldInfo = {};
        }
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
    var fieldValueId = 'fieldvalue-' + this._fieldNameToID(fieldName);
    fieldInfo = this._sanitizeFieldInfo(fieldInfo, valueData);
    if (!fieldInfo || !fieldInfo.type || fieldInfo.type == 'any') {
        //TODO: Any!
        parentNode.append("Render error: Type is required and must not be 'any'.");
/*        var typeOptions = $('<select id="' + fieldValueId + '-type"></select> ');
        typeOptions.addClass("field-type-select");
        typeOptions.append('<option>string</option>');
        typeOptions.append('<option>number</option>');
        typeOptions.append('<option>integer</option>');
        typeOptions.append('<option>boolean</option>');
        typeOptions.append('<option>object</option>');
        typeOptions.append('<option>array</option>');
        parentNode.append(typeOptions); */
    } else if (fieldInfo.type == 'string') {
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
            if (fieldInfo && fieldInfo.description) {
                fieldNode.attr('title', fieldInfo.description);
            }
        }
        fieldNode.attr('data-type', fieldInfo.type);
        tdN.append(fieldNode);
        if (fieldInfo && fieldInfo.description) {
            tdN.append(' <small class="description"><em>' + fieldInfo.description + '</em></small>');
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
            if (fieldInfo) {
                if (fieldInfo.description) {
                    fieldNode.attr('title', fieldInfo.description);
                }
                if ('default' in fieldInfo) {
                    fieldNode.attr('placeholder', fieldInfo.default);
                }
            }
        }
        fieldNode.attr('data-type', fieldInfo.type);
        tdN.append(fieldNode);
        if (fieldInfo && fieldInfo.description) {
            tdN.append(' <small class="description"><em>' + fieldInfo.description + '</em></small>');
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
        fieldNode.attr('data-type', fieldInfo.type);
        tdN.append(fieldNode);
        if (fieldInfo) {
            if (fieldInfo.description) {
                tdN.append(' <small class="description"><em>' + fieldInfo.description + '</em></small>');
            }
            if ('default' in fieldInfo) {
                fieldNode.attr('checked', 'checked');
            }
        }
        parentNode.append(tdN);
    } else if (fieldInfo.type == 'object') {
        //if (fieldInfo.additionalItems) {
        //  this.innerSchemas[fieldName] = fieldInfo;
        //}
        this.renderObject(fieldInfo, parentNode, fieldName, valueData);
    } else if (fieldInfo.type == 'array') {
        if (fieldInfo.items instanceof Array) {
            var contN = $('<ol id="' + fieldValueId + '" start="0"></ol>');
            contN.attr('data-type', 'array');
            var lastIndex = 0;
            //TODO: Support type array (render values)
/*            if (valueData) {
                for (var idat = 0; idat < valueData.length; idat++) {
                    lastIndex++;
                    var chRowN = this.renderListItemField(fieldName, fieldInfo.items, lastIndex, valueData[idat]);
                    contN.append(chRowN);
                }
            } */
            parentNode.append(contN);
            var editBar = $('<div class="edit-bar array" id="' + fieldValueId + '-edit-bar"></div>');
            var inner = $('<small></small>');
            inner.append('Add item: ');
            var typeOptions = $('<select id="' + fieldValueId + '-type"></select> ');
            for (var iati = 0; iati < fieldInfo.items.length; ++iati) {
                typeOptions.append('<option>' + fieldInfo.items[iati].type + '</option>');
                //TODO: Support more object and array
            }
            inner.append(typeOptions);
            inner.append('<a href="" class="item-add" data-object-namespace="' + fieldName + '" data-field-id="' + fieldValueId + '" data-last-index="' + lastIndex + '">Add</a>');
            editBar.append(inner);
            parentNode.append(editBar);
        } else {
            var itemType = 'any';
            if (fieldInfo && fieldInfo.items) {
                itemType = fieldInfo.items.type || 'any'; //TODO: Handle 'any'
            }
            if (itemType == 'object') {
                // Save the object schema of the item
                this.innerSchemas[fieldName] = fieldInfo.items;
            }
            var contN = $('<ol id="' + fieldValueId + '" start="0"></ol>');
            contN.attr('data-type', 'array');
            var lastIndex = 0;
            if (valueData) {
                for (var idat = 0; idat < valueData.length; idat++) {
                    lastIndex++;
                    var chRowN = this.renderListItemField(fieldName, fieldInfo ? fieldInfo.items : null, lastIndex, valueData[idat]);
                    contN.append(chRowN);
                }
            }
            parentNode.append(contN);
            var editBar = $('<div class="edit-bar array" id="' + fieldValueId + '-edit-bar"></div>');
            var inner = $('<small></small>');
            if (itemType == 'any') {
                // Give all primitive types
                var typeOptions = $('<select id="' + fieldValueId + '-type"></select> ');
                typeOptions.append('<option>string</option>');
                typeOptions.append('<option>number</option>');
                typeOptions.append('<option>integer</option>');
                typeOptions.append('<option>boolean</option>');
                typeOptions.append('<option>object</option>');
                typeOptions.append('<option>array</option>');
                inner.append('Add item: ');
                inner.append(typeOptions);
                inner.append('<a href="" class="item-add" data-field-id="' + fieldValueId + '" data-object-namespace="' + fieldName + '" data-last-index="' + lastIndex + '">Add</a>');
            } else {
                inner.append('<a href="" class="item-add" data-field-id="' + fieldValueId + '" data-object-namespace="' + fieldName + '" data-last-index="' + lastIndex + '" data-object-type="' + itemType + '">+ Add item</a>');
            }
            editBar.append(inner);
            parentNode.append(editBar);
        }
    } else if (fieldInfo.type == '$ref: #') { //HACK
        this.renderObject(this.documentSchema, parentNode, fieldName, valueData);
    } else {
        var tdN = $('<span class="value">Unsupported property type: <strong>' + fieldInfo.type + '</strong></span>');
        parentNode.append(tdN);
    }
};

onde.Onde.prototype.renderObjectPropertyField = function (namespace, baseId, fieldInfo, propName, valueData) {
    var fieldName = namespace + this.fieldNamespaceSeparator + propName;
    var fieldValueId = 'fieldvalue-' + this._fieldNameToID(fieldName);
    var rowN = $('<li></li>');
    fieldInfo = this._sanitizeFieldInfo(fieldInfo, valueData);
    rowN.addClass('field');
    if (typeof fieldInfo.type == 'string') {
        if (fieldInfo.type._startsWith('$ref: ')) {
            rowN.addClass('object');
        } else {
            rowN.addClass(fieldInfo.type);
        }
    }
    //rowN.addClass('property');
    //rowN.addClass(baseId + '-property');
    var labelN = $('<label for="' + fieldValueId + '"></label>');
    labelN.addClass('field-name');
    if ((fieldInfo.type == 'object' && fieldInfo.display != 'inline') || fieldInfo.type == 'array' || (typeof fieldInfo.type == 'string' && fieldInfo.type._startsWith('$ref: '))) {
        labelN.addClass('collapsible');
        //TODO: Description here
    }
    if (namespace === '' && this.documentSchema.primaryProperty && this.documentSchema.primaryProperty == propName) {
        labelN.append('<strong>' + propName + '*: </strong>');
    } else {
        if (fieldInfo.required) {
            labelN.append(propName + '*: ');
        } else {
            labelN.append(propName + ': ');
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
            //TODO: More actions (only if qualified)
            if (fieldInfo._deletable) {
                rowN.append('<small> <a href="" class="field-delete" data-id="field-' + this._fieldNameToID(fieldName) + '">del</a> <small>');
            }
        }
    }
    return rowN;
};

onde.Onde.prototype.renderListItemField = function (namespace, fieldInfo, index, valueData) {
    var itemId = index;
    var fieldName = namespace + '[' + itemId + ']';
    var fieldValueId = 'fieldvalue-' + this._fieldNameToID(fieldName);
    var rowN = $('<li></li>');
    fieldInfo = this._sanitizeFieldInfo(fieldInfo, valueData);
    rowN.addClass('field');
    if (fieldInfo) {
        rowN.addClass(fieldInfo.type);
    }
    rowN.addClass('array-item');
    rowN.attr('id', 'field-' + this._fieldNameToID(fieldName));
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
        rowN.append(labelN);
    }
    if (labelN) {
        labelN.attr('data-field-id', fieldValueId);
    }
    this.renderFieldValue(fieldName, fieldInfo, rowN, valueData);
    rowN.append('<small> <a href="" class="field-delete" data-id="field-' + this._fieldNameToID(fieldName) + '">del</a> <small>');
    return rowN;
};


onde.Onde.prototype.onAddObjectProperty = function (handle) {
    //TODO: Focus on the new field
    //TODO: Check if the key already used
    var baseId = handle.attr('data-field-id');
    var propName = $('#' + baseId + '-key').val();
    if (!propName) {
        return;
    }
    var namespace = handle.attr('data-object-namespace');
    var ftype = $('#' + baseId + '-type').val();
    var baseNode = $('#' + baseId);
    var fieldInfo = null;
    if (ftype == 'object') {
        //TODO: Get the inner schema (or generic object)
        if (!fieldInfo) {
            fieldInfo = { type: ftype, additionalProperties: true, _deletable: true }
        }
    } else {
        fieldInfo = { type: ftype, _deletable: true };
    }
    var rowN = this.renderObjectPropertyField(namespace, baseId, fieldInfo, propName);
    baseNode.append(rowN);
    $('#' + baseId + '-key').val('');
    rowN.hide();
    rowN.fadeIn('fast');
};

onde.Onde.prototype.onAddListItem = function (handle) {
    //TODO: Focus on the new field
    var baseId = handle.attr('data-field-id');
    var lastIndex = parseInt(handle.attr('data-last-index')) + 1;
    handle.attr('data-last-index', lastIndex);
    var namespace = handle.attr('data-object-namespace');
    var ftype = handle.attr('data-object-type');
    if (!ftype) {
        ftype = $('#' + baseId + '-type').val();
    }
    var baseNode = $('#' + baseId);
    var fieldInfo = null;
    if (ftype == 'object') {
        //TODO: Get the inner schema (or generic object)
        fieldInfo = this.innerSchemas[namespace];
        if (!fieldInfo) {
            fieldInfo = { type: ftype, additionalProperties: true }
        }
    } else {
        fieldInfo = { type: ftype };
    }
    var rowN = this.renderListItemField(namespace, fieldInfo, lastIndex);
    baseNode.append(rowN);
    $('#' + baseId + '-key').val('');
    rowN.hide();
    rowN.fadeIn('fast');
};

onde.Onde.prototype.onFieldTypeChanged = function (handle) {
    //TODO
    //this.renderFieldValue(handle.attr('name'), { type: handle.val(), items: { type: 'string' } }, handle.parent());
};

onde.Onde.prototype._generateFieldId = function () {
    return 'f' + parseInt(Math.random() * 1000000);
};
onde.Onde.prototype._fieldNameToID = function (fieldName) {
    var t = fieldName.replace(this.fieldNamespaceSeparatorRegex, '-');
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
                    console.log("Unsupported type: " + dataType + " (" + fieldName + ")");
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
                        console.log("Unsupported type: " + dataType + " (" + fieldName + ")");
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
