Onde
====

**Onde** is a web front-end library for JSON document editor. Onde uses 
json-schema as the base data to build the form.

**NOTE**: Please note that this project is incomplete. It has some missing 
functionalities and features. It has partial non-conformal standards implementation.


Limitations
-----------

* Object property names in schema have these limitations: 
  they must contain only alphabet, numeric or underscore; they must not start 
  with a number. This is because Onde uses some other characters to denote the 
  object structures in the HTML.
* Array as type (union) is currently not supported.
* No schema referencing yet.
* No intensive validation on the data on export.


Quick Start
-----------

- Open the file `samples/app.html` in a web browser (Firefox or Safari, 
  won't work with Chrome locally due its strict cross-origin policy).
- Click the "Load Schema" menu item.
- Enter `schemas/test.json` into the "Schema URL" field.
- Push the "Load" button.


Links
-----

- http://json.org/
- http://json-schema.org/


License
-------

See LICENSE file.

