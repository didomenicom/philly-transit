/* eslint-disable  func-names */
/* eslint quote-props: ["error", "consistent"] */
const Alexa = require('alexa-sdk')
// const AWS = require('aws-sdk') // this is defined to enable a DynamoDB connection from local testing
const septa = require('./src/septa')

// AWS.config.update({
// 	region: 'us-east-1',
// })

const APP_ID = 'amzn1.ask.skill.9452fb03-c4ed-4650-a321-fee8c7edb9ec'

const languageStrings = {
	en: {
		translation: {
			WELCOME: 'Welcome to the Philly Transit skill.',
			TITLE: 'Philly Transit',
			HELP: 'This skill will help you get from place to place',
			STOP: 'Okay, see you next time!',
		},
	},
}

const welcomeCardImg = {
	smallImageUrl: '',
	largeImageUrl: '',
}


const processSlotSynonym = (inputSlot) => {
	return new Promise((resolve, reject) => {
		if(inputSlot.resolutions.resolutionsPerAuthority.length > 1){
			// TODO: Log this
			reject(Error('Received more than one response. Not handled properly.'))
		}

		resolve(inputSlot.resolutions.resolutionsPerAuthority[0].values[0].value.name)
	})
}

const handlers = {
	'LaunchRequest': function (){
		let say

		if(!this.attributes.currentStep){
			say = `${this.t('WELCOME')} + ' ' + this.t('HELP')`

			this.response.cardRenderer(this.t('TITLE'), this.t('WELCOME'), welcomeCardImg)
		} else {
			say = 'This function is not implemented. Game over.'
			this.response.cardRenderer('Continue?', `\n${say}`)
		}

		this.response.speak(say).listen(say)
		this.emit(':responseReady')
	},

	'DirectTrip': function (){
		let requestOriginStation
		let requestFinalStation

		return new Promise((resolve, reject) => {
			const slotPromiseArray = []
			try {
				const { request } = this.event
				const { originStation, finalStation } = request.intent.slots

				if(originStation.resolutions != null){
					slotPromiseArray.push(processSlotSynonym(originStation)
					.then((result) => {
						requestOriginStation = result
					}))
				}

				if(finalStation.resolutions != null){
					slotPromiseArray.push(processSlotSynonym(finalStation)
					.then((result) => {
						requestFinalStation = result
					}))
				}

				Promise.all(slotPromiseArray)
				.then(() => {
					if(requestOriginStation === undefined){
						console.log('Request OriginStation is undefined')
						console.log(originStation.value)
					}

					if(requestFinalStation === undefined){
						console.log('Request FinalStation is undefined')
						console.log(finalStation.value)
					}
				})
				.then(() => {
					resolve()
				})
			} catch (e){
				// handle error here
				reject(Error('Error processing slots'))
				console.log('error')
				console.log(e)
			}
		})
		.then(() => {
			console.log(requestOriginStation)
			console.log(requestFinalStation)
			return septa.realTime.getNext(requestOriginStation, requestFinalStation, 0)
		})
		.then((route) => {
			this.response.cardRenderer(`${this.t('TITLE')} Route (${requestOriginStation} to ${requestFinalStation})`, septa.realTime.generateText(requestOriginStation, requestFinalStation, route, false))
			this.response.speak(septa.realTime.generateText(requestOriginStation, requestFinalStation, route, true))

			this.emit(':responseReady')
		})
		.catch((err) => {
			console.log('ERROR')
			console.log(err)
			console.log(err.message)
			this.response.speak(err.message)
		})
	},

	'AMAZON.YesIntent': function (){
		this.emit('AMAZON.NextIntent')
	},

	'AMAZON.NoIntent': function (){
		this.response.speak('This function is not implemented...')
		this.emit(':responseReady')
	},

	'AMAZON.PauseIntent': function (){
		this.response.speak('This function is not implemented...')
		this.emit(':responseReady')
	},

	'AMAZON.NextIntent': function (){
		this.response.speak('This function is not implemented...')
		this.emit(':responseReady')
	},

	'AMAZON.PreviousIntent': function (){
		this.emit('AMAZON.NextIntent')
	},

	'AMAZON.RepeatIntent': function (){
		this.emit('AMAZON.NextIntent')
	},

	'AMAZON.HelpIntent': function (){
		if(!this.attributes.currentStep){ // new session
			this.response.speak(this.t('HELP')).listen(this.t('HELP'))
		} else {
			const say = 'This function is not implemented...'
			const reprompt = 'Try again some other time'
			this.response.speak(say + reprompt).listen(reprompt)
		}

		this.emit(':responseReady')
	},

	'AMAZON.StartOverIntent': function (){
		delete this.attributes.currentStep
		this.emit('LaunchRequest')
	},

	'AMAZON.CancelIntent': function (){
		this.response.speak(this.t('STOP'))
		this.emit(':responseReady')
	},

	'AMAZON.StopIntent': function (){
		this.emit('SessionEndedRequest')
	},

	'SessionEndedRequest': function (){
		console.log('session ended!')
		this.response.speak(this.t('STOP'))
		this.emit(':responseReady')
	},
}

exports.handler = (event, context, callback) => {
	const alexa = Alexa.handler(event, context, callback)
	alexa.appId = APP_ID
	alexa.resources = languageStrings
	alexa.registerHandlers(handlers)
	alexa.execute()
}
