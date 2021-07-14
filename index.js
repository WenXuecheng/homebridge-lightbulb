module.exports = (api) => {
    api.registerAccessory('Lightbulb', LightbulbAccessory);
};

function switch_on_raspberry(switch_name, switch_option, log) {
    return new Promise(resolve => {
        const http = require('http');
        http.get('http://localhost:8001/homebridge/switch/' + switch_name + '/' + switch_option, (res) => {
            const {statusCode} = res;
            const contentType = res.headers['content-type'];
            let rawData = '';
            let error;
            // 任何 2xx 状态码都表示成功响应，但这里只检查 200。
            if (statusCode !== 200) {
                error = new Error('Request Failed.\n' +
                    `Status Code: ${statusCode}`);
            } else if (!/^application\/json/.test(contentType)) {
                error = new Error('Invalid content-type.\n' +
                    `Expected application/json but received ${contentType}`);
            }
            if (error) {
                // 消费响应数据以释放内存
                res.resume();
                log.error(error.message);
                return;
            }
            res.setEncoding('utf8');
            res.on('data', (chunk) => {
                rawData += chunk;
            });
            res.on('end', () => {
                try {
                    const parsedData = JSON.parse(rawData);
                    //log.info(parsedData);
                    resolve(parsedData);
                } catch (e) {
                    log.error(e.message);
                }
            });
        }).on('error', (e) => {
            log.error(`Got error: ${e.message}`);
        });
    });
}




class LightbulbAccessory {

    /**
     * REQUIRED - This is the entry point to your plugin
     */
    constructor(log, config, api) {
        this.log = log;
        this.config = config;
        this.api = api;

        this.Service = this.api.hap.Service;
        this.Characteristic = this.api.hap.Characteristic;
        // your accessory must have an AccessoryInformation service
        this.informationService = new this.api.hap.Service.AccessoryInformation()
            .setCharacteristic(this.api.hap.Characteristic.Manufacturer, "Connor Manufacturer")
            .setCharacteristic(this.api.hap.Characteristic.Model, "Connor Model");
        this.name = config.name;
        // create a new "Switch" service
        this.lightbulbService = new this.Service.Lightbulb(this.name);

        // link methods used when getting or setting the state of the service
        this.lightbulbService.getCharacteristic(this.Characteristic.On)
            .onGet(this.getOnHandler.bind(this))   // bind to getOnHandler method below
            .onSet(this.setOnHandler.bind(this));  // bind to setOnHandler method below
    }

    /**
     * REQUIRED - This must return an array of the services you want to expose.
     * This method must be named "getServices".
     */
    getServices() {
        return [
            this.informationService,
            this.lightbulbService,
        ];
    }

    async getOnHandler() {
        //this.log.info('Getting switch state');

        // get the current value of the switch in your own code
        let s = await switch_on_raspberry(this.config.name, 'get', this.log);
        s = s.status_switch;
        const value = true;
        return value;
    }

    async setOnHandler(value) {
        let op
        if (value)
             op = 'open';
        else
            op = 'close';
        switch_on_raspberry(this.config.name, op, this.log);
    }
}
