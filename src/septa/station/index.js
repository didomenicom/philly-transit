const fs = require('fs')

module.exports.get = (stationJSON, stationName) => {
	return new Promise((resolve, reject) => {
		if(!fs.existsSync(stationJSON)){
			reject(Error('File not found'))
		}

		let json = []

		fs.readFile(stationJSON, 'utf8', (err, data) => {
			if(err){
				reject(err)
			}

			json = JSON.parse(data)

			resolve(json)
		})
	})
	.then((jsonData) => {
		if(jsonData.languageModel.types != null){
			for(let iType = 0; iType < jsonData.languageModel.types.length; iType++){
				const type = jsonData.languageModel.types[iType]

				if(type.name === 'Stations'){
					if(type.values != null){
						for(let iStationName = 0; iStationName < type.values.length; iStationName++){
							const stationObj = type.values[iStationName]

							// Now that we have made it to the stations... lets match the station name (case insensitive), or the synonyms for said station... returning the station name
							if(stationObj.name.value.toUpperCase() === stationName.toUpperCase()){
								return stationObj.name.value
							}

							for(let iSynonym = 0; iSynonym < stationObj.name.synonyms.length; iSynonym++){
								const synonym = stationObj.name.synonyms[iSynonym]

								if(synonym.toUpperCase() === stationName.toUpperCase()){
									return stationObj.name.value
								}
							}
						}
					}
				}
			}
		}

		return null
	})
}
