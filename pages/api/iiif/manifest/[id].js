import * as jsonld from 'jsonld'
import {omit} from 'lodash'

const frame = {
  "@context" : {
    "id": "@id",
    "type": "@type",
    "body" : {
      "@id" : "http://www.w3.org/ns/oa#body",
    },
    "Annotation" : {
      "@id" : "http://www.w3.org/ns/oa#Annotation",
      "@type" : "@id"
    },
    "items" : {
      "@id" : "http://iiif.io/api/presentation/3#items",
      "@type" : "@id"
    },
    "label" : {
      "@id" : "http://www.w3.org/2000/01/rdf-schema#label"
    },
    "Manifest" : {
      "@id" : "http://iiif.io/api/presentation/3#Manifest",
      "@type" : "@id"
    },
    "Range" : {
      "@id" : "http://iiif.io/api/presentation/3#Range",
      "@type" : "@id"
    },
    "Canvas" : {
      "@id" : "http://iiif.io/api/presentation/3#Canvas",
      "@type" : "@id"
    },
    "structures" : {
      "@id" : "http://iiif.io/api/presentation/3#structures",
      "@type" : "@id"
    },
    "description" : {
      "@id" : "http://purl.org/dc/elements/1.1/description"
    },
    "identifier" : {
      "@id" : "http://purl.org/dc/terms/identifier"
    },
    "sc" : "http://iiif.io/api/presentation/3#",
    "oa" : "http://www.w3.org/ns/oa#",
    "dct" : "http://purl.org/dc/terms/",
    "rdf" : "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
    "ubbont" : "http://data.ub.uib.no/ontology/",
    "rdfs" : "http://www.w3.org/2000/01/rdf-schema#",
    "dc" : "http://purl.org/dc/elements/1.1/"
  },
  "@type": "sc:Manifest"
}

async function constructManifest(data) {
  let manifest = {
    "@context": "http://iiif.io/api/presentation/3/context.json",
    id: data.id,
    type: data.type,
    label: data.label,
    provider: [
      {
        "id": "https://www.uib.no/ub",
        "type": "Agent",
        "label": { 
          "no": [ "Universitetsbiblioteket i Bergen" ],
          "en": [ "University of Bergen Library" ] 
        },
        "homepage": [
          {
            "id": "https://www.uib.no/ub",
            "type": "Text",
            "label": { 
              "no": [ "Universitetsbiblioteket i Bergen hjemmeside" ],
              "en": [ "University of Bergen Library Homepage" ] 
            },
            "format": "text/html"
          }
        ],
        "logo": [
          {
            "id": "http://marcus.uib.no/img/UiBmerke_grayscale.svg",
            "type": "Image",
            "format": "image/svg+xml"
          }
        ]
      }
    ],
    "rights": "https://creativecommons.org/licenses/by/4.0/",
    "requiredStatement": {
      "label": { 
        "no": [ "Kreditering" ],
        "en": [ "Attribution" ] 
      },
      "value": { 
        "no": [ "Tilgjengeliggjort av Universitetsbiblioteket i Bergen" ],
        "en": [ "Provided by University of Bergen Library" ] 
      }
    },
    items: [
      ...data.items.map(canvas => {
        return {
          id: canvas.id,
          type: canvas.type,
          label: canvas.label,
          width: 3000,
          height: 5000,
          items: [
            {
              id: canvas.items.id,
              type: "AnnotationPage",
              label: canvas.label,
              items: [
                {
                  type: "Annotation",
                  motivation: "painting",
                  label: canvas.label,
                  target: canvas.id,
                  body: {
                    "id": canvas.items.body.id,
                    "type": "Image",
                    "format": "image/jpeg",
                    "width": 3000,
                    "height": 5000
                  }
                }
              ]
            }
          ]
        }
      })
    ],
    "structures": [
      {
        id: data.structures.id,
        type: data.structures.type,
        label: "Default",
        items: [
          ...data.structures.items.map(item => {
            return {
              id: item,
              type: "Canvas",
            }
          })
        ]
      }
    ]
  }

  return manifest
}


export default async function handler(req, res) {
  const {
    query: { id },
    method,
  } = req

  async function getObject(id) {
    if(!id) {
      return error
    }

    let query = `
      PREFIX dct: <http://purl.org/dc/terms/> PREFIX ubbont: <http://data.ub.uib.no/ontology/> PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> PREFIX sc: <http://iiif.io/api/presentation/3#> PREFIX dc: <http://purl.org/dc/elements/1.1/> PREFIX oa: <http://www.w3.org/ns/oa#> CONSTRUCT { ?s a sc:Manifest ; dct:identifier ?id ; rdfs:label ?title ; dc:description ?desc ; sc:items ?part ; sc:structures ?rangeURL . ?rangeURL a sc:Range ; sc:items ?part . ?part a sc:Canvas ; rdfs:label ?seq ; sc:items ?resource . ?resource a oa:Annotation ; oa:body ?imgUrl . } WHERE { GRAPH ?g { VALUES ?id {"${id}"} ?s ubbont:hasRepresentation ?repr ; dct:title ?title ; dct:description ?desc ; dct:identifier ?id . ?repr dct:hasPart ?part ; rdfs:label ?partLabel . ?part ubbont:hasResource ?resource ; ubbont:sequenceNr ?seq . ?resource ubbont:hasMDView ?image . BIND (iri(?image) as ?imgUrl ) BIND (iri(concat("http://data.ub.uib.no/instance/manuscript/", ?id, "/manifest")) AS ?manifestURL) BIND (iri(concat("http://data.ub.uib.no/instance/manuscript/", ?id, "/manifest/range/1")) AS ?rangeURL) } } ORDER BY ?s ?repr ?part ?resource ?image  
    `

    const results = fetch(`http://sparql.ub.uib.no/sparql/query?query=${encodeURIComponent(query)}&output=json`)
      .then(response => response.json())
      .catch(err => (console.log(err)))

    return results
  }

  switch (method) {
    case 'GET':
      const results = await getObject(id)
      const toFrame = await results
      const framed = jsonld.frame(toFrame, frame);
      const object = await framed
      
      let x = omit(object,["@context"])
      const constructedManifest = await constructManifest(x)
      const manifest = await constructedManifest

      res.status(200).json(manifest)
      break
    default:
      res.setHeader('Allow', ['GET'])
      res.status(405).end(`Method ${method} Not Allowed`)
  }
}
