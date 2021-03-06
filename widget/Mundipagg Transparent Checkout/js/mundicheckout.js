define([], function () {
    return {
        MundiCheckout: {
            $script: null,
            $form: null,
            $forms: null,
            appId: null,
            apiURL: null,
            mundipaggElementAttr: 'data-mundicheckout-input',
            tokensRequestCount: 0,

            init: function (callback, errorCallback) {
                // this.$script = null;
                // this.$form = null;
                // this.$forms = null;
                // this.appId = null;
                // this.apiURL = null;
                // this.mundipaggElementAttr = 'data-mundicheckout-input';
                // this.tokensRequestCount = 0;
                // if (!this.$forms) {
                this.setup();
                // }

                // console.log("init");

                var $this = this;
                this.$forms.forEach(function (form) {
                    if (form.$creditCardBrands) {
                        form.$creditCardNumbers.forEach(function (element, index) {
                            element.addEventListener('keypress', function (e) {
                                $this.keyEventHandlerCard(e, element, index, form);
                            }, false);
                        });
                        form.$creditCardNumbers.forEach(function (element, index) {
                            element.addEventListener('keydown', function (e) {
                                $this.keyEventHandlerCard(e, element, index, form);
                            }, false);
                        });
                        form.$creditCardNumbers.forEach(function (element, index) {
                            element.addEventListener('keyup', function (e) {
                                $this.keyEventHandlerCard(e, element, index, form);
                            }, false);
                        });
                    }
                });

                // console.log("this.$forms", this.$forms);

                this.$forms.forEach(function (form) {
                    // console.log("form", form);

                    form.addEventListener("submit", function (e) {
                        // console.log("submit");

                        e.preventDefault();

                        var mundiTokens = $('[name^="munditoken"]', $this);
                        for (var i = 0; i < mundiTokens.length; i += 1) {
                            $this.removeChild(mundiTokens[i]);
                        }

                        var markedInputs = $('[' + $this.mundipaggElementAttr + ']', $this);

                        var checkoutObjects = form.$holder_names.reduce(function (acc, element, index) {
                            if (form.$disabledForms() && form.$disabledForms().indexOf(index) !== -1) {
                                return acc;
                            }
                            acc.push({
                                card: $this.createCheckoutObj(index, form),
                                type: "card"
                            });
                            return acc;
                        }, []);

                        if (checkoutObjects.length === 0) {
                            callback({
                                message: 'No forms enabled'
                            });
                            return;
                        }
                        var cardRequests = checkoutObjects.map(function (checkoutObj) {
                            return new Promise(function (resolve, reject) {
                                $this.getAPIData($this.apiURL, checkoutObj,
                                    function (data) {
                                        var objJSON = data;
                                        objJSON.index = checkoutObj.card.index;
                                        resolve(objJSON);
                                    },
                                    function (error) {
                                        reject(error);
                                    }
                                );
                            });
                        });
                        Promise.all(cardRequests)
                            .then(function (cards) {
                                // console.log("pro then", sessionStorage.getItem("formasPagamento_c"));

                                $this.finalizeSubmit(callback, markedInputs, cards);
                            })
                            .catch(function (error) {
                                // console.log("pro cat", sessionStorage.getItem("formasPagamento_c"));
                                errorCallback.call(null, error);
                            });
                        if (e.preventDefault) {
                            e.preventDefault();
                        } else {
                            e.returnValue = false;
                        }
                    }, false);
                });
            },

            setup: function () {
                // console.log("setup");

                this.$forms = $('[data-mundicheckout-form]');
                this.$form = $('[data-mundicheckout-form]')[0];
                this.$forms = [].slice.call(this.$forms);
                var $this = this;
                this.$forms.forEach(function (form) {
                    form.$holder_names = $this.formToArray($('[' + $this.mundipaggElementAttr + '^=holder_name]'), form);
                    form.$creditCardNumbers = $this.formToArray($('[' + $this.mundipaggElementAttr + '^=number]'));
                    form.$creditCardBrands = $this.formToArray($('[' + $this.mundipaggElementAttr + '^=brand]'));
                    form.$expDates = $this.formToArray($('[' + $this.mundipaggElementAttr + '^=exp_date]'));
                    form.$expMonths = $this.formToArray($('[' + $this.mundipaggElementAttr + '^=exp_month]'));
                    form.$expYears = $this.formToArray($('[' + $this.mundipaggElementAttr + '^=exp_year]'));
                    form.$cvvs = $this.formToArray($('[' + $this.mundipaggElementAttr + '^=cvv]'));
                    form.$disabledForms = function () {
                        return form.getAttribute('disabled-forms');
                    };
                });
                //TODO: Verificar o número de forms e se estão todos completos
                // const allForms = [$holder_names, $creditCardNumbers, $creditCardBrands, $expMonths, $expYears, $cvvs];
                // const formLengthsDontMatch = allForms.some( elem => elem.length !== formLenCount);
                // if(formLengthsDontMatch) console.error('O NÚMERO DE ELEMENTOS DE CADA FORMULÁRIO ESTÁ ERRADO')

                this.$script = $('[data-mundicheckout-app-id]')[0];
                this.appId = $this.$script.getAttribute('data-mundicheckout-app-id');

                var production = true;

                // console.log("this.appId", this.appId);


                if (production) {
                    this.apiURL = 'https://api.mundipagg.com/core/v1/tokens?appId=' + this.appId;
                }
                else {
                    this.apiURL = 'https://stgapi.mundipagg.com/core/v1/tokens?appId=' + this.appId;
                }
            },

            createCheckoutObj: function (index, form) {
                var obj = {};
                try {
                    obj['index'] = index;
                    obj['type'] = 'card';
                    obj['holder_name'] = $(form).find('.mpagg-holder-name').val().normalize("NFD").replace(/[^a-zA-Z\ ]+/g, '');
                    obj['cvv'] = $(form).find('.mpagg-cvv').val();
                    if ($('.mpagg-cpf').val() != "") {
                        if (!$(".mpagg-cpf").hasClass("mpagg-cpf-card")) {
                            obj['holder_document'] = $('.mpagg-cpf').val().replace(/\D/g, '');
                        }
                        else {
                            obj['holder_document'] = $('.mpagg-cpf').val().replace(/\D/g, '');
                        }
                    }else{
                        obj['holder_document']  = "00000000000";
                    }
                    if (form.$expDates[index]) {
                        obj = this.generateExpParts(obj, form, index);
                    } else {
                        obj['exp_month'] = $(form).find('.mpagg-exp-month').val();
                        obj['exp_year'] = $(form).find('.mpagg-exp-year').val();
                    }
                    obj['number'] = $(form).find('.mpagg-card-number').val().replace(/\D/g, '');
                    return obj;
                } catch (error) {
                    return {
                        error: error.toString()
                    };
                }
            },

            finalizeSubmit: function (callback, markedInputs, cards) {
                if (callback) {
                    var cb = callback.call(null, cards);
                    if (typeof cb === 'boolean' && !cb) {
                        enableFields(markedInputs);
                        return;
                    }
                }
                this.disableFields(markedInputs);
            },

            formToArray: function (query) {
                var $this = this;
                return Array.prototype.slice.call(query).reduce(function (obj, element) {
                    obj[$this.getIndex(element.getAttribute($this.mundipaggElementAttr))] = element;
                    return obj;
                }, []);
            },

            getIndex: function (fieldName) {
                var temp = fieldName.split('-');
                return temp[0] !== fieldName ? temp[1] : 0;
            },

            generateExpParts: function (obj, form, index) {
                obj['exp_month'] = form.$expDates[index].value.split(/[\/-]+/)[0];
                obj['exp_year'] = form.$expDates[index].value.split(/[\/-]+/)[1];
                return obj;
            },

            disableFields: function (fields) {
                for (var i = 0; i < fields.length; i += 1) {
                    fields[i].setAttribute('disabled', 'disabled');
                }
            },

            enableFields: function (fields) {
                for (var i = 0; i < fields.length; i += 1) {
                    fields[i].removeAttribute('disabled');
                }
            },

            getAPIData: function (url, data, success, fail) {
                $.ajax({
                    type: 'POST',
                    url: url,
                    crossDomain: true,
                    data: JSON.stringify(data),
                    dataType: 'json',
                    contentType: "application/json",
                    success: success,
                    error: fail
                });

            },

            getBrand: function (types, bin) {
                var oldPrefix = '';
                var currentBrand;
                for (var i = 0; i < types.length; i += 1) {
                    var current_type = types[i];
                    for (var j = 0; j < current_type.prefixes.length; j += 1) {
                        var prefix = current_type.prefixes[j].toString();
                        if (bin.indexOf(prefix) === 0 && oldPrefix.length < prefix.length) {
                            oldPrefix = prefix;
                            currentBrand = current_type.brandName;
                        }
                    }
                }
                return currentBrand;
            },

            changeBrand: function (brand, index, form) {
                var $brand = form.$creditCardBrands[index];
                var imageSrc = 'https://checkout.mundipagg.com/images/brands/';
                var $img = $('img', $brand)[0];
                var src;
                if (brand === '') {
                    $brand.innerHTML = '';
                } else {
                    src = imageSrc + brand + '.min.png';
                    if (!$img) {
                        var $newImg = document.createElement('img');
                        $newImg.setAttribute('src', src);
                        $brand.appendChild($newImg);
                    } else {
                        $img.setAttribute('src', src);
                    }
                }
            },

            keyEventHandlerCard: function (event, elem, index, form) {
                var cardNumber = elem.value.replace(/\s/g, '');
                var bin = cardNumber.substr(0, 6);
                var types = this.getCardTypes();
                var brand;
                if (cardNumber.length >= 6) {
                    brand = this.getBrand(types, bin);
                    if (brand) {
                        this.changeBrand(brand, index, form);
                    } else {
                        this.changeBrand('', index, form);
                    }
                } else {
                    this.changeBrand('', index, form);
                }
            },

            queryAll: function (selector, context) {
                return (context || document).querySelectorAll(selector);
            },

            serialize: function (obj, prefix) {
                var str = [],
                    p;
                for (p in obj) {
                    if (obj.hasOwnProperty(p)) {
                        var k = prefix ? prefix + '[' + p + ']' : p,
                            v = obj[p];
                        str.push((v !== null && typeof v === 'object') ?
                            this.serialize(v, k) :
                            encodeURIComponent(k) + '=' + encodeURIComponent(v));
                    }
                }
                return str.join('&');
            },

            getCardTypes: function () {
                return [
                    // CARNET
                    {
                        brand: 'carnet',
                        brandName: 'Carnet',
                        gaps: [4, 8, 12],
                        lenghts: [16],
                        mask: '/(\\d{1,4})/g',
                        cvv: 3,
                        prefixes: [
                            "502275", "506199", "506201", "506202", "606333", "506203", "506204", "506205", "506206", "506212",
                            "506213", "506214", "506215", "506217", "506218", "506222", "506228", "506229", "506236", "506237", "506245", "506247", "506249", "506250", "506251", "506253", "506254",
                            "506255", "506257", "506258", "506259", "506261", "506262", "506263", "506265", "506269", "506270", "506272", "506273", "506274", "506275", "506276", "506277", "506278",
                            "506279", "506280", "506281", "506282", "506283", "506284", "506287", "506294", "506297", "506299", "506300", "506301", "506302", "506303", "506304", "506305", "506306",
                            "506307", "636379", "506309", "506311", "506312", "506313", "506314", "506319", "506320", "639388", "506323", "506329", "639484", "506330", "506332", "639559", "506333",
                            "506334", "506335", "506336", "506337", "506339", "506340", "506341", "506342", "506343", "506344", "506349", "506350", "506351", "506352", "506353", "506354", "506355",
                            "286900", "506356", "506357", "506359", "506360", "506361", "506364", "506365", "506366", "506367", "506369", "506370", "506371", "506372", "506373", "506374", "506394",
                            "506402", "506379", "506380", "506382", "506383", "506384", "506386", "506387", "506391", "506392"
                        ]
                    },
                    // ELO
                    {
                        brand: 'elo',
                        brandName: 'Elo',
                        gaps: [4, 8, 12],
                        lenghts: [16],
                        mask: '/(\\d{1,4})/g',
                        cvv: 3,
                        prefixes: [
                            "506707", "506708", "506715", "506718", "506719", "506720", "506721", "506722", "506724", "506725", "506726", "506727", "506728", "506729", "506730",
                            "506731", "506732", "506733", "506734", "506735", "506736", "506739", "506741", "506742", "506743", "506745", "506746", "506747", "506753", "506774",
                            "506775", "506776", "506777", "506778", "509000", "509001", "509002", "509003", "509004", "509005", "509006", "509007", "509009", "509010", "509011",
                            "509012", "509014", "509020", "509021", "509022", "509023", "509024", "509025", "509026", "509027", "509028", "509029", "509030", "509035", "509036",
                            "509037", "509038", "509039", "509040", "509041", "509042", "509044", "509045", "509046", "509047", "509048", "509049", "509050", "509051", "509052",
                            "509053", "509054", "509055", "509056", "509057", "509058", "509059", "509060", "509061", "509062", "509063", "509064", "509065", "509066", "509067",
                            "509068", "509069", "509070", "509071", "509072", "509073", "509074", "509075", "509076", "509077", "509078", "509079", "509080", "509081", "509082",
                            "509083", "509084", "509085", "509086", "509087", "509088", "509089", "509091", "509092", "509093", "509094", "509095", "509096", "509097", "509098",
                            "509099", "509100", "509101", "509104", "509105", "509106", "509107", "509108", "509109", "509110", "509111", "509112", "509113", "509114", "509115",
                            "509116", "509117", "509118", "509119", "509120", "509121", "509122", "509123", "509124", "509125", "509126", "509127", "509128", "509129", "509130",
                            "509131", "509132", "509133", "509134", "509135", "509136", "509137", "509138", "509139", "509140", "509141", "509142", "509143", "509144", "509145",
                            "509146", "509147", "509148", "509149", "509150", "509151", "509152", "509153", "509154", "509155", "509156", "509157", "509158", "509159", "509160",
                            "509161", "509162", "509163", "509164", "509165", "509166", "509167", "509168", "509169", "509170", "509171", "509172", "509173", "509174", "509175",
                            "509176", "509177", "509178", "509179", "509180", "509181", "509182", "509183", "509184", "509185", "509186", "509187", "509188", "509189", "509190",
                            "509191", "509192", "509193", "509194", "509195", "509196", "509197", "509198", "509199", "509200", "509201", "509202", "509203", "509204", "509205",
                            "509206", "509207", "509208", "509209", "509210", "509211", "509212", "509213", "509214", "509215", "509216", "509217", "509218", "509219", "509220",
                            "509221", "509222", "509223", "509224", "509225", "509226", "509227", "509228", "509229", "509230", "509231", "509232", "509233", "509234", "509235",
                            "509236", "509237", "509238", "509239", "509240", "509241", "509242", "509243", "509244", "509245", "509246", "509247", "509248", "509249", "509250",
                            "509251", "509252", "509253", "509254", "509255", "509256", "509257", "509258", "509259", "509260", "509261", "509262", "509263", "509264", "509265",
                            "509266", "509267", "509268", "509269", "509270", "509271", "509272", "509273", "509274", "509275", "509276", "509277", "509278", "509279", "509280",
                            "509281", "509282", "509283", "509284", "509285", "509286", "509287", "509288", "509289", "509290", "509291", "509292", "509293", "509294", "509295",
                            "509296", "509297", "509298", "509299", "509300", "509301", "509302", "509303", "509304", "509305", "509306", "509307", "509308", "509309", "509310",
                            "509311", "509312", "509313", "509314", "509315", "509316", "509317", "509318", "509319", "509320", "509321", "509322", "509323", "509324", "509325",
                            "509326", "509327", "509328", "509329", "509330", "509331", "509332", "509333", "509334", "509335", "509336", "509337", "509338", "509339", "509340",
                            "509341", "509342", "509343", "509344", "509345", "509346", "509347", "509348", "509349", "509350", "509351", "509352", "509353", "509354", "509355",
                            "509356", "509357", "509358", "509359", "509360", "509361", "509362", "509363", "509364", "509365", "509366", "509367", "509368", "509369", "509370",
                            "509371", "509372", "509373", "509374", "509375", "509376", "509377", "509378", "509379", "509380", "509381", "509382", "509383", "509384", "509385",
                            "509386", "509387", "509388", "509389", "509390", "509391", "509392", "509393", "509394", "509395", "509396", "509397", "509398", "509399", "509400",
                            "509401", "509402", "509403", "509404", "509405", "509406", "509407", "509408", "509409", "509410", "509411", "509412", "509413", "509414", "509415",
                            "509416", "509417", "509418", "509419", "509420", "509421", "509422", "509423", "509424", "509425", "509426", "509427", "509428", "509429", "509430",
                            "509431", "509432", "509433", "509434", "509435", "509436", "509437", "509438", "509439", "509440", "509441", "509442", "509443", "509444", "509445",
                            "509446", "509447", "509448", "509449", "509450", "509451", "509452", "509453", "509454", "509455", "509456", "509457", "509458", "509459", "509460",
                            "509461", "509462", "509463", "509464", "509465", "509466", "509467", "509468", "509469", "509470", "509471", "509472", "509473", "509474", "509475",
                            "509476", "509477", "509478", "509479", "509480", "509481", "509482", "509483", "509484", "509485", "509486", "509487", "509488", "509489", "509490",
                            "509491", "509492", "509493", "509494", "509495", "509496", "509497", "509498", "509499", "509500", "509501", "509502", "509503", "509504", "509505",
                            "509506", "509507", "509508", "509509", "509510", "509511", "509512", "509513", "509514", "509515", "509516", "509517", "509518", "509519", "509520",
                            "509521", "509522", "509523", "509524", "509525", "509526", "509527", "509528", "509529", "509530", "509531", "509532", "509533", "509534", "509535",
                            "509536", "509537", "509538", "509539", "509540", "509541", "509542", "509543", "509544", "509545", "509546", "509547", "509548", "509549", "509550",
                            "509551", "509552", "509553", "509554", "509555", "509556", "509557", "509558", "509559", "509560", "509561", "509562", "509563", "509564", "509565",
                            "509566", "509567", "509568", "509569", "509570", "509571", "509572", "509573", "509574", "509575", "509576", "509577", "509578", "509579", "509580",
                            "509581", "509582", "509583", "509584", "509585", "509586", "509587", "509588", "509589", "509590", "509591", "509592", "509593", "509594", "509595",
                            "509596", "509597", "509598", "509599", "509600", "509601", "509602", "509603", "509604", "509605", "509606", "509607", "509608", "509609", "509610",
                            "509611", "509612", "509613", "509614", "509615", "509616", "509617", "509618", "509619", "509620", "509621", "509622", "509623", "509624", "509625",
                            "509626", "509627", "509628", "509629", "509630", "509631", "509632", "509633", "509634", "509635", "509636", "509637", "509638", "509639", "509640",
                            "509641", "509642", "509643", "509644", "509645", "509646", "509647", "509648", "509649", "509650", "509651", "509652", "509653", "509654", "509655",
                            "509656", "509657", "509658", "509659", "509660", "509661", "509662", "509663", "509664", "509665", "509666", "509667", "509668", "509669", "509670",
                            "509671", "509672", "509673", "509674", "509675", "509676", "509677", "509678", "509679", "509680", "509681", "509682", "509683", "509684", "509685",
                            "509686", "509687", "509688", "509689", "509690", "509691", "509692", "509693", "509694", "509695", "509696", "509697", "509698", "509699", "509700",
                            "509701", "509702", "509703", "509704", "509705", "509706", "509707", "509708", "509709", "509710", "509711", "509712", "509713", "509714", "509715",
                            "509716", "509717", "509718", "509719", "509720", "509721", "509722", "509723", "509724", "509725", "509726", "509727", "509728", "509729", "509730",
                            "509731", "509732", "509733", "509734", "509735", "509736", "509737", "509738", "509739", "509740", "509741", "509742", "509743", "509744", "509745",
                            "509746", "509747", "509748", "509749", "509750", "509751", "509752", "509753", "509754", "509755", "509756", "509757", "509758", "509759", "509760",
                            "509761", "509762", "509763", "509764", "509765", "509766", "509767", "509768", "509769", "509770", "509771", "509772", "509773", "509774", "509775",
                            "509776", "509777", "509778", "509779", "509780", "509781", "509782", "509783", "509784", "509785", "509786", "509787", "509788", "509789", "509790",
                            "509791", "509792", "509793", "509794", "509795", "509796", "509797", "509798", "509799", "509800", "509801", "509802", "509803", "509804", "509805",
                            "509806", "509807", "509831", "509832", "509833", "509834", "509835", "509836", "509837", "509838", "509839", "509840", "509841", "509842", "509843",
                            "509844", "509845", "509846", "509847", "509848", "509849", "509850", "509851", "509852", "509853", "509854", "509855", "509856", "509857", "509858",
                            "509859", "509860", "509861", "509862", "509863", "509864", "509865", "509866", "509867", "509868", "509869", "509870", "509871", "509872", "509873",
                            "509874", "509875", "509876", "509877", "509897", "509898", "509899", "509900", "509918", "509919", "509920", "509921", "509922", "509923", "509924",
                            "509925", "509926", "509927", "509928", "509929", "509930", "509931", "509932", "509933", "509934", "509935", "509936", "509937", "509938", "509939",
                            "509940", "509941", "509942", "509943", "509944", "509945", "509946", "509947", "509948", "509949", "509950", "509951", "509952", "509953", "509954",
                            "509955", "509956", "509957", "509958", "509959", "509960", "509961", "509962", "509963", "509964", "509971", "509972", "509973", "509974", "509975",
                            "509976", "509977", "509978", "509979", "509980", "509981", "509982", "509983", "509984", "509985", "509986", "509995", "509996", "509997", "509998",
                            "509999", "627780", "636368", "650031", "650032", "650033", "650035", "650036", "650037", "650038", "650039", "650040", "650041", "650042", "650043",
                            "650044", "650045", "650046", "650047", "650048", "650049", "650050", "650051", "650057", "650058", "650059", "650060", "650061", "650062", "650063",
                            "650064", "650065", "650066", "650067", "650068", "650069", "650070", "650071", "650072", "650073", "650074", "650075", "650076", "650077", "650078",
                            "650079", "650080", "650081", "650406", "650407", "650408", "650409", "650410", "650411", "650412", "650413", "650414", "650415", "650416", "650417",
                            "650418", "650419", "650420", "650421", "650422", "650423", "650424", "650425", "650426", "650427", "650428", "650429", "650430", "650431", "650432",
                            "650433", "650434", "650435", "650436", "650437", "650438", "650439", "650485", "650486", "650487", "650488", "650489", "650490", "650491", "650492",
                            "650493", "650494", "650495", "650496", "650497", "650498", "650499", "650500", "650501", "650502", "650503", "650504", "650506", "650507", "650508",
                            "650509", "650510", "650511", "650512", "650513", "650514", "650515", "650516", "650517", "650518", "650519", "650520", "650521", "650522", "650523",
                            "650524", "650525", "650526", "650527", "650528", "650529", "650530", "650531", "650532", "650533", "650534", "650535", "650536", "650537", "650538",
                            "650552", "650553", "650554", "650555", "650556", "650557", "650558", "650559", "650560", "650561", "650562", "650563", "650564", "650565", "650566",
                            "650567", "650568", "650569", "650570", "650571", "650572", "650573", "650574", "650575", "650576", "650577", "650578", "650579", "650580", "650581",
                            "650582", "650583", "650584", "650585", "650586", "650587", "650588", "650589", "650590", "650591", "650592", "650593", "650594", "650595", "650596",
                            "650597", "650598", "650720", "650721", "650722", "650723", "650724", "650725", "650726", "650727", "650901", "650902", "650903", "650904", "650905",
                            "650906", "650907", "650908", "650909", "650910", "650911", "650912", "650913", "650914", "650915", "650916", "650917", "650918", "650919", "650920",
                            "650921", "650922", "650928", "650938", "650939", "650946", "650947", "650948", "650949", "650950", "650951", "650952", "650953", "650954", "650955",
                            "650956", "650957", "650958", "650959", "650960", "650961", "650962", "650963", "650964", "650965", "650966", "650967", "650968", "650969", "650970",
                            "650971", "650972", "650973", "650974", "650975", "650976", "650977", "650978", "651652", "651653", "651654", "651655", "651656", "651657", "651658",
                            "651659", "651660", "651661", "651662", "651663", "651664", "651665", "651666", "651667", "651668", "651669", "651670", "651671", "651672", "651673",
                            "651674", "651675", "651676", "651677", "651678", "651679", "651680", "651681", "651682", "651683", "651684", "651685", "651686", "651687", "651688",
                            "651689", "651690", "651691", "651692", "651693", "651694", "651695", "651696", "651697", "651698", "651699", "651700", "651701", "651702", "651703",
                            "651704", "655000", "655001", "655002", "655003", "655004", "655005", "655006", "655007", "655008", "655009", "655010", "655011", "655012", "655013",
                            "655014", "655015", "655016", "655017", "655018", "655019", "655021", "655022", "655023", "655024", "655025", "655026", "655027", "655028", "655029",
                            "655030", "655031", "655032", "655033", "655034", "655035", "655036", "655037", "655038", "655039", "655040", "655041", "655042", "655043", "655044",
                            "655045", "655046", "655047", "655048", "655049", "655050", "655051", "655052", "655053", "655054", "655055", "655056", "655057"
                        ]
                    },
                    // SODEXO
                    {
                        brand: 'sodexo',
                        brandName: 'Sodexo',
                        gaps: [4, 8, 12],
                        lenghts: [16],
                        mask: '/(\\d{1,4})/g',
                        cvv: 3,
                        prefixes: ["606071", "603389", "606070", "606068", "606069", "600818"]
                    },
                    // VR
                    {
                        brand: 'vr',
                        brandName: 'VR',
                        gaps: [4, 8, 12],
                        lenghts: [16],
                        mask: '/(\\d{1,4})/g',
                        cvv: 3,
                        prefixes: ["637036", "627416", "636350", "637037"]
                    },
                    // ALELO
                    {
                        brand: 'alelo',
                        brandName: 'Alelo',
                        gaps: [4, 8, 12],
                        lenghts: [16],
                        mask: '/(\\d{1,4})/g',
                        cvv: 3,
                        prefixes: ["506700", "506701", "506702", "506704", "506705", "506706", "506714", "506716", "506760", "506761", "506762", "506763", "506764", "506765", "506770", "506771",
                            "506772", "506773", "506699", "506703", "506713", "506754", "506755", "506756", "506757", "506758", "506759", "506766", "506767", "506769", "509880", "509881",
                            "509882", "509883", "509884", "509885", "509886", "509887", "509888", "509889", "509890", "509891", "509892", "509893", "506749", "506750", "506751", "506752",
                            "509987", "509988", "509989", "509990", "509991", "509992"]
                    },
                    // MAIS
                    {
                        brand: 'mais',
                        brandName: 'Mais',
                        gaps: [4, 8, 12],
                        lenghts: [16],
                        mask: '/(\\d{1,4})/g',
                        cvv: 3,
                        prefixes: ["628028"]
                    },
                    // HIPERCARD
                    {
                        brand: 'hipercard',
                        brandName: 'Hipercard',
                        gaps: [4, 8, 12],
                        lenghts: [13, 16, 19],
                        mask: '/(\\d{1,4})/g',
                        cvv: 3,
                        prefixes: ["384100", "384140", "384160", "606282", "637095", "637568", "637599", "637600", "637609", "637612"]
                    },
                    // DISCOVER
                    {
                        brand: 'discover',
                        brandName: 'Discover',
                        gaps: [4, 8, 12],
                        lenghts: [16],
                        mask: '/(\\d{1,4})/g',
                        cvv: 4,
                        prefixes: ["6011", "622", "64", "65"]
                    },
                    // PAQUETA
                    {
                        brand: 'paqueta',
                        brandName: 'Paqueta',
                        gaps: [4, 8, 12],
                        lenghts: [16],
                        mask: '/(\\d{1,4})/g',
                        cvv: 3,
                        prefixes: ["960371"]
                    },
                    // DINERS
                    {
                        brand: 'diners',
                        brandName: 'Diners',
                        gaps: [4, 8, 12],
                        lenghts: [14, 16],
                        mask: '/(\\d{1,4})/g',
                        cvv: 3,
                        prefixes: ["300", "301", "302", "303", "304", "305", "36", "38"]
                    },
                    // AMEX
                    {
                        brand: 'amex',
                        brandName: 'Amex',
                        gaps: [4, 10],
                        lenghts: [15],
                        mask: '/(\\d{1,4})(\\d{1,6})?(\\d{1,5})?/g',
                        cvv: 4,
                        prefixes: ["34", "37"]
                    },
                    // AURA
                    {
                        brand: 'aura',
                        brandName: 'Aura',
                        gaps: [4, 8, 12],
                        lenghts: [16],
                        mask: '/(\\d{1,4})/g',
                        cvv: 3,
                        prefixes: ["50"]
                    },
                    // JCB
                    {
                        brand: 'jcb',
                        brandName: 'JCB',
                        gaps: [4, 8, 12],
                        lenghts: [16],
                        mask: '/(\\d{1,4})/g',
                        cvv: 3,
                        prefixes: ["35", "2131", "1800"]
                    },
                    // VISA
                    {
                        brand: 'visa',
                        brandName: 'Visa',
                        gaps: [4, 8, 12],
                        lenghts: [13, 16],
                        mask: '/(\\d{1,4})/g',
                        cvv: 3,
                        prefixes: ["4"]
                    },
                    // MASTERCARD
                    {
                        brand: 'mastercard',
                        brandName: 'Mastercard',
                        gaps: [4, 8, 12],
                        lenghts: [16],
                        mask: '/(\\d{1,4})/g',
                        cvv: 3,
                        prefixes: ["5", "2"]
                    }
                ];
            }
        }
    };
});