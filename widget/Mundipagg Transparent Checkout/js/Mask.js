
define([], function () {
    return {
        format: function (element, placeholder) {
            var el = document.querySelector(element);
            var maskForm = '';

            if (el === undefined || el === null) {
                return null;
            }

            if (el.dataset.mask !== undefined || el.dataset.mask !== null) {
                maskForm = el.dataset.mask;
                el.maxLength = maskForm.length;
            }

            if (placeholder === true) {
                el.placeholder = maskForm;
            }

            el.addEventListener('keyup', function (e) {
                if (e.keyCode === 8 ^ e.keyCode === 46) {
                    return;
                }
                formato(maskForm);
            });

            function formato(mask) {
                var text = '';
                var data = el.value;
                var c, m, i, x;

                for (i = 0, x = 1; x && i < mask.length; ++i) {
                    c = data.charAt(i);
                    m = mask.charAt(i);

                    switch (mask.charAt(i)) {
                        case '#':
                            if (/\d/.test(c)) {
                                text += c;
                            } else {
                                x = 0;
                            }
                            break;

                        case 'A':
                            if (/[a-z]/i.test(c)) {
                                text += c;
                            } else {
                                x = 0;

                            }
                            break;

                        case 'N':
                            if (/[a-z0-9]/i.test(c)) {
                                text += c;
                            } else {
                                x = 0;
                            }
                            break;

                        case 'X':
                            text += c;
                            break;

                        default:
                            text += m;
                            break;
                    }
                }
                el.value = text;
            }
        }
    };
});