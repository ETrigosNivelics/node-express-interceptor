module.exports = function(req, res, next) {
    require('dotenv').config();
    const debug = require('debug')('node-express-interceptor');
    
    try {
        const chunks = [];
        const originalEnd = res.end;
        const originalWrite = res.write;
        const exceptions = process.env.INTERCEPTOR_EXCEPTIONS ? process.env.INTERCEPTOR_EXCEPTIONS.split(',') : [];
        const logPath = process.env.INTERCEPTOR_LOG_PATH;

        debug('req.url:::', req.url);
        debug('req.method:::', req.method);
        // debug('req.headers:::', req.headers);
        // debug('req.body:::', req.body);
        debug('exceptions:::', exceptions);

        if (exceptions.some((exception) => req.url.includes(exception))) {
            debug('Url excluded:::', req.url);
            return next();
        }

        res.write = function(chunk) {
            console.log('res.write.chunk:::', chunk)
            chunks.push(chunk);
            originalWrite.apply(res, arguments);
        }

        res.end = function(chunk) {
            debug('res.end:::', typeof chunk, chunk);
            if (chunk) chunks.push(chunk);
            const body = Buffer.concat(chunks).toString('utf8');

            const logData = JSON.stringify({
                timestamp: new Date().toISOString(),
                method: req.method,
                url: req.url,
                status: res.statusCode,
                body: body,
                reqHeaders: req.headers ? JSON.stringify(req.headers) : null,
                resHeaders: res.getHeaders() ? JSON.stringify(res.getHeaders()) : null,
            });

            const fs = require('fs');
            fs.appendFileSync(logPath, `${logData}\n`, (err) => {
                if (err) {
                    console.error('Error al escribir en el archivo de logs:', err);
                }
            });

            debug('logString:::', logData);

            originalEnd.apply(res, arguments);
        }
    } catch (error) {
        debug('Error: %s', error.message)
    }

    next();
}
