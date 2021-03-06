/*!
 * Copyright 2017 - 2018 Hitachi Vantara. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
define([
  "tests/pentaho/util/errorMatch",
  "pentaho/type/Context",
  "pentaho/type/ValidationError",
  "pentaho/data/Table",
  "tests/pentaho/type/propertyTypeUtil"
], function(errorMatch, Context, ValidationError, Table, propertyTypeUtil) {

  "use strict";

  /* globals describe, it, beforeAll, beforeEach, afterEach, spyOn */

  describe("pentaho.visual.role.BaseProperty", function() {

    describe(".Type", function() {

      var AbstractModel;
      var context;

      beforeAll(function(done) {

        Context.createAsync()
            .then(function(_context) {
              context = _context;

              return context.getDependencyApplyAsync([
                "pentaho/visual/base/abstractModel"
              ], function(_AbstractModel) {
                AbstractModel = _AbstractModel;
              });
            })
            .then(done, done.fail);

      });

      // region helper methods
      function getDataSpec1() {
        return {
          model: [
            {name: "country", type: "string", label: "Country"},
            {name: "product", type: "string", label: "Product"},
            {name: "sales", type: "number", label: "Sales"},
            {name: "date", type: "date", label: "Date"}
          ],
          rows: [
            {c: ["Portugal", "fish", 100, "2016-01-01"]},
            {c: ["Ireland", "beer", 200, "2016-01-02"]}
          ]
        };
      }

      function createFullValidQualitativeMapping() {

        var DerivedVisualModel = AbstractModel.extend({
          $type: {
            props: {
              propRole: {
                base: "pentaho/visual/role/baseProperty"
              }
            }
          }
        });

        var data = new Table(getDataSpec1());

        var model = new DerivedVisualModel({
          data: data,
          propRole: {fields: ["country", "product"]}
        });

        assertIsValid(model);

        return model;
      }

      function assertIsValid(complex) {
        // this way, errors are shown in the console...
        expect(complex.validate()).toBe(null);
      }
      // endregion

      describe("#fields", function() {

        it("should get an object that conforms to the interface IFieldsConstraints", function() {

          var Model = AbstractModel.extend({
            $type: {
              props: {
                propRole: {
                  base: "pentaho/visual/role/baseProperty"
                }
              }
            }
          });

          var rolePropType = Model.type.get("propRole");
          var fields = rolePropType.fields;

          expect(fields instanceof Object).toBe(true);
          expect("isRequired" in fields).toBe(true);
          expect("countMin" in fields).toBe(true);
          expect("countMax" in fields).toBe(true);
          expect("countRangeOn" in fields).toBe(true);
        });

        it("should get the same object each time", function() {

          var Model = AbstractModel.extend({
            $type: {
              props: {
                propRole: {
                  base: "pentaho/visual/role/baseProperty"
                }
              }
            }
          });

          var rolePropType = Model.type.get("propRole");
          var fields1 = rolePropType.fields;
          var fields2 = rolePropType.fields;

          expect(fields1).toBe(fields2);
        });

        it("should set only the specified properties", function() {

          var fieldsSpec0 = {
            isRequired: function() {},
            countMin: function() {},
            countMax: function() {}
          };

          var Model = AbstractModel.extend({
            $type: {
              props: {
                propRole: {
                  base: "pentaho/visual/role/baseProperty",
                  fields: fieldsSpec0
                }
              }
            }
          });

          var fieldsSpec1 = {
            isRequired: function() {}
          };

          var rolePropType = Model.type.get("propRole");

          rolePropType.fields = fieldsSpec1;

          expect(rolePropType.fields.isRequired).toBe(fieldsSpec1.isRequired);
          expect(rolePropType.fields.countMin).toBe(fieldsSpec0.countMin);
          expect(rolePropType.fields.countMax).toBe(fieldsSpec0.countMax);
        });
      });

      describe("#validateOn(model)", function() {

        doValidateTests(false);
        doValidateTests(true);

        function doValidateTests(useTxn) {

          describe(useTxn ? "ambient" : "direct", function() {

            var txnScope;

            beforeEach(function() {
              if(useTxn) txnScope = context.enterChange();
            });

            afterEach(function() {
              if(txnScope) txnScope.dispose();
            });

            function assertIsInvalid(model) {
              if(txnScope) txnScope.acceptWill();

              expect(model.$type.get("propRole").validateOn(model) != null).toBe(true);
            }

            it("should stop validation if base validation returns errors", function() {

              var Model = AbstractModel.extend({
                $type: {
                  props: {
                    propRole: {
                      base: "pentaho/visual/role/baseProperty"
                    }
                  }
                }
              });

              var rolePropType = Model.type.get("propRole");

              var model = new Model({
                propRole: {fields: [{}]}
              });

              expect(model.propRole.fields.count).toBe(1);

              // Assumptions
              var errors = rolePropType.validateOn(model);
              expect(Array.isArray(errors)).toBe(true);
              expect(errors.length).toBe(1);
            });

            it("should be invalid when fields.isRequired and there are no fields", function() {

              var Model = AbstractModel.extend({
                $type: {
                  props: {
                    propRole: {
                      base: "pentaho/visual/role/baseProperty",
                      fields: {
                        isRequired: true
                      }
                    }
                  }
                }
              });

              var rolePropType = Model.type.get("propRole");

              var model = new Model({
                data: new Table(getDataSpec1())
              });

              var errors = rolePropType.validateOn(model);
              expect(errors).toEqual([
                jasmine.any(ValidationError)
              ]);
            });

            it("should be valid when fields.isRequired and there are fields", function() {

              var Model = AbstractModel.extend({
                $type: {
                  props: {
                    propRole: {
                      base: "pentaho/visual/role/baseProperty",
                      fields: {
                        isRequired: true
                      }
                    }
                  }
                }
              });

              var rolePropType = Model.type.get("propRole");

              var model = new Model({
                data: new Table(getDataSpec1()),
                propRole: {fields: ["country"]}
              });

              var errors = rolePropType.validateOn(model);

              expect(errors).toBe(null);
            });

            it("should be invalid when fields.countMin = 2 and there are no fields", function() {

              var Model = AbstractModel.extend({
                $type: {
                  props: {
                    propRole: {
                      base: "pentaho/visual/role/baseProperty",
                      fields: {
                        countMin: 2
                      }
                    }
                  }
                }
              });

              var rolePropType = Model.type.get("propRole");

              var model = new Model({
                data: new Table(getDataSpec1())
              });

              var errors = rolePropType.validateOn(model);
              expect(errors).toEqual([
                jasmine.any(ValidationError)
              ]);
            });

            it("should be valid when fields.countMin = 2 and there are 2 fields", function() {

              var Model = AbstractModel.extend({
                $type: {
                  props: {
                    propRole: {
                      base: "pentaho/visual/role/baseProperty",
                      fields: {
                        countMin: 2
                      }
                    }
                  }
                }
              });

              var rolePropType = Model.type.get("propRole");

              var model = new Model({
                data: new Table(getDataSpec1()),
                propRole: {fields: ["country", "product"]}
              });

              var errors = rolePropType.validateOn(model);

              expect(errors).toBe(null);
            });

            it("should be invalid when fields.countMax = 1 and there are 2 fields", function() {

              var Model = AbstractModel.extend({
                $type: {
                  props: {
                    propRole: {
                      base: "pentaho/visual/role/baseProperty",
                      fields: {
                        countMax: 1
                      }
                    }
                  }
                }
              });

              var rolePropType = Model.type.get("propRole");

              var model = new Model({
                data: new Table(getDataSpec1()),
                propRole: {fields: ["country", "product"]}
              });

              var errors = rolePropType.validateOn(model);
              expect(errors).toEqual([
                jasmine.any(ValidationError)
              ]);
            });

            it("should be valid when fields.countMax = 1 and there are 1 fields", function() {

              var Model = AbstractModel.extend({
                $type: {
                  props: {
                    propRole: {
                      base: "pentaho/visual/role/baseProperty",
                      fields: {
                        countMax: 1
                      }
                    }
                  }
                }
              });

              var rolePropType = Model.type.get("propRole");

              var model = new Model({
                data: new Table(getDataSpec1()),
                propRole: {fields: ["country"]}
              });

              var errors = rolePropType.validateOn(model);

              expect(errors).toBe(null);
            });

            it("should be invalid, when the model has no data", function() {

              var model = createFullValidQualitativeMapping();

              model.data = null;

              assertIsInvalid(model);
            });

            it("should be invalid, when the name of a mapping field is not defined in the model data", function() {

              var model = createFullValidQualitativeMapping();
              model.propRole.fields.add({name: "mugambo"});

              assertIsInvalid(model);
            });

            it("should be invalid when a mapping has duplicate names", function() {

              var model = createFullValidQualitativeMapping();

              var containedField = model.propRole.fields.at(0);

              model.propRole.fields.add(containedField.clone());

              assertIsInvalid(model);
            });
          });
        }
      });

      describe("#_fillSpecInContext(spec, keyArgs)", function() {

        describe("#fields", function() {

          describe("countMin", function() {

            propertyTypeUtil.itDynamicAttribute("countMin", 1, "pentaho/visual/role/baseProperty", "fields");

          });

          describe("countMax", function() {

            propertyTypeUtil.itDynamicAttribute("countMax", 2, "pentaho/visual/role/baseProperty", "fields");

          });

          describe("isRequired", function() {

            propertyTypeUtil.itDynamicAttribute("isRequired", true, "pentaho/visual/role/baseProperty", "fields");

          });
        });
      });
    });
  });
});
