const { Client } = require('node-rest-client')

const client = new Client()

const debug = (startStation, endStation, route) => {
	if(route.orig_line === route.term_line){
		// This is a direct route
		console.log('Starting %s', startStation)
		console.log('\tTrain: %s (leaving @ %s)', route.orig_train, route.orig_departure_time)
		console.log('Ending %s', endStation)
		console.log('\tTrain: %s (arriving @ %s)', route.term_train, route.term_arrival_time)
	} else {
		// This is an indirect route with a connection
		console.log('Starting %s', startStation)
		console.log('\tTrain: %s (leaving @ %s)', route.orig_train, route.orig_departure_time)
		console.log('Connection %s', route.Connection)
		console.log('\tLine: %s', route.term_line)
		console.log('\tTrain: %s', route.term_train)
		console.log('\t\tLeaving: %s', route.term_depart_time)
		console.log('\t\tArriving: %s', route.term_arrival_time)
		console.log('Ending %s', endStation)
		// console.log('\tTrain: %s (arriving @ %s)', route.term_train, route.term_arrival_time)
	}

	console.log('--------------------------')
}

const getSecondsFromHourMinutes = (inputTimeStr) => {
	return new Promise((resolve) => {
		let seconds = 0
		console.log(inputTimeStr)
		const parts = inputTimeStr.split(':')

		if(inputTimeStr.indexOf('AM') > -1){
			parts[1] = parts[1].replace('AM', '')
			parts[2] = 'AM'
		} else if(inputTimeStr.indexOf('PM') > -1){
			parts[1] = parts[1].replace('PM', '')
			parts[2] = 'PM'
		}

		// Figure out if this is 12 hour format and we need to add 12 hours to the seconds
		if(parts[2] != null){
			if(parts[2].toUpperCase() === 'PM' && parts[0] < 12){
				seconds += 12 * 60 * 60 // 12 hours
			}
		}

		// Hours
		seconds += parts[0] * 60 * 60

		// Minutes
		seconds += parts[1] * 60

		resolve(seconds)
	})
}

module.exports.list = (startStation, endStation) => {
	return new Promise((resolve, reject) => {
		client.get(`https://www3.septa.org/hackathon/NextToArrive/${startStation}/${endStation}/`, (data) => {
			resolve(data)
		})
		.on('error', (err) => {
			reject(Error('something went wrong on request', err.request.options))
		})
	})
	.then((data) => {
		return data
	})
}

module.exports.getNext = (startStation, endStation, nextRouteIndex) => {
	// The next route index is for handling the use case where the person does not want the route given to them, but the one after that.
	const nextRouteIndx = (typeof nextRouteIndex !== 'undefined' ? nextRouteIndex : 0)

	return new Promise((resolve, reject) => {
		if(startStation == null){
			reject(Error('Start Station Null'))
		}

		if(endStation == null){
			reject(Error('End Station Null'))
		}

		client.get(`https://www3.septa.org/hackathon/NextToArrive/${startStation}/${endStation}/`, (data) => {
			resolve(data)
		})
		.on('error', (err) => {
			reject(Error('something went wrong on request', err.request.options))
		})
	})
	.then((data) => {
		const promiseArray = []
		const closestToArrive = {}

		return new Promise((resolve) => {
			resolve()
		})
		.then(() => {
			for(let i = 0; i < data.length; i++){
				const route = data[i]

				promiseArray.push(Promise.resolve()
				.then(() => {
					console.log(route)
					const arrivalTime = (route.isdirect === true ? route.orig_arrival_time : route.term_arrival_time)
					return getSecondsFromHourMinutes(arrivalTime) - getSecondsFromHourMinutes(route.orig_departure_time)
				})
				.then((routeSeconds) => {
					closestToArrive[routeSeconds] = route
				}))
			}
		})
		.then(() => {
			return Promise.all(promiseArray)
		})
		.then(() => {
			if(Object.keys(closestToArrive)[nextRouteIndx] != null){
				return closestToArrive[Object.keys(closestToArrive)[nextRouteIndx]]
			}

			return null
		})
	})
}

module.exports.generateText = (startStation, endStation, route, speak) => {
	const spokenText = (typeof speak !== 'undefined' ? speak : true)
	let responseText

	if(route.orig_line !== undefined && route.term_line !== undefined){
		// This is a route that could cross lines
		if(route.orig_line === route.term_line){
			// This is a direct route
			responseText = `You want to take train number ${route.orig_train}${(spokenText === false ? `, from ${startStation}` : '')}, departing at ${route.orig_departure_time}. It arrives at ${endStation} at ${(route.isdirect === true && route.term_arrival_time !== undefined ? route.orig_arrival_time : route.term_arrival_time)}`
		} else {
			// This is an indirect route with a connection
			responseText = `You want to take train number ${route.orig_train}${(spokenText === false ? `, from ${startStation}` : '')}, departing at ${route.orig_departure_time}. It arrives at ${route.Connection} at ${route.orig_arrival_time}. Then at ${route.term_depart_time}, take train number ${route.term_train} to ${endStation}. It will arrive at ${route.term_arrival_time}`
		}
	} else {
		// This is a direct route on the same line
		responseText = `You want to take train number ${route.orig_train}${(spokenText === false ? `, from ${startStation}` : '')}, departing at ${route.orig_departure_time}. It arrives at ${endStation} at ${(route.isdirect === false && route.term_arrival_time !== undefined ? route.term_arrival_time : route.orig_arrival_time)}`

		// For debugging purposes to try and understand the APIs, lets log some info here if needed
		if(route.isdirect === false){
			// We have a direct route with an isdirect flag == false
			console.log('Direct Route with isdirect == false')
			console.log(route)
		}
	}

	return responseText
}
