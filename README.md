Onde
====

**Onde** is a web front-end library for JSON document editor. Onde uses 
json-schema as the base data to build the form.

**NOTE**: Please note that this project is very far from practically useful. 
There's so many missing functionalities and features. It has non-conformal 
standards implementation. The code is not well structured and optimized with 
bad practices all over the place. And also, the UI and UX are not well designed.


Limitations
-----------

* Object property names in schema have these limitations: 
  they must contain only alphabet, numeric or underscore; they must not start 
  with a number. This because Onde uses some other characters to denote the 
  object structures in the HTML.
* Onde currently doesn't support array in 'type' property of schema (union).
* Onde currently needs the object properties in schema to have valid type.
* Onde currently doesn't support schema referencing.
* Onde currently doesn't perform real validation.


Quick Start
-----------

- Open the file `samples/app.html` in a web browser (Firefox or Safari, won't work with Chrome).
- Click the "Load Schema" menu item.
- Enter `schemas/test.json` into the "Schema URL" field.
- Push the "Load" button.


Links
-----

- http://json.org/
- http://json-schema.org/


(Un)license
-----------

This is free and unencumbered software released into the public domain.

