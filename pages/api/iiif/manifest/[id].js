import * as jsonld from 'jsonld'
import { omit, sortBy } from 'lodash'

const frame = {
  "@context": {
    "id": "@id",
    "type": "@type",
    "value": "@value",
    "body": {
      "@id": "http://www.w3.org/ns/oa#body",
    },
    "Annotation": {
      "@id": "http://www.w3.org/ns/oa#Annotation",
      "@type": "@id"
    },
    "items": {
      "@id": "http://iiif.io/api/presentation/3#items",
      "@type": "@id"
    },
    "homepage": {
      "@id": "http://iiif.io/api/presentation/3#homepage",
      "@type": "@id"
    },
    "label": {
      "@id": "http://www.w3.org/2000/01/rdf-schema#label"
    },
    "seeAlso": {
      "@id": "http://www.w3.org/2000/01/rdf-schema#seeAlso",
      "@type": "@id"
    },
    "Manifest": {
      "@id": "http://iiif.io/api/presentation/3#Manifest",
      "@type": "@id"
    },
    "Range": {
      "@id": "http://iiif.io/api/presentation/3#Range",
      "@type": "@id"
    },
    "Canvas": {
      "@id": "http://iiif.io/api/presentation/3#Canvas",
      "@type": "@id"
    },
    "structures": {
      "@id": "http://iiif.io/api/presentation/3#structures",
      "@type": "@id"
    },
    "thumbnail": {
      "@id": "http://iiif.io/api/presentation/3#thumbnail",
    },
    "description": {
      "@id": "http://purl.org/dc/elements/1.1/description"
    },
    "identifier": {
      "@id": "http://purl.org/dc/terms/identifier"
    },
    "sc": "http://iiif.io/api/presentation/3#",
    "oa": "http://www.w3.org/ns/oa#",
    "dct": "http://purl.org/dc/terms/",
    "rdf": "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
    "ubbont": "http://data.ub.uib.no/ontology/",
    "rdfs": "http://www.w3.org/2000/01/rdf-schema#",
    "dc": "http://purl.org/dc/elements/1.1/"
  },
  "@type": "Manifest",
}

async function constructManifest(data) {
  let manifest = {
    "@context": "http://iiif.io/api/presentation/3/context.json",
    id: data.id,
    type: data.type,
    label: { no: [data.label] },
    ...(data.description && {
      summary: {
        none: [data.description]
      }
    }),
    thumbnail: [
      {
        id: data.thumbnail.value,
        type: "Image",
        format: "image/jpeg"
      }
    ],
    viewingDirection: "left-to-right",
    behavior: ["paged"],
    homepage: [
      {
        id: data.homepage,
        type: "Text",
        label: {
          en: [`Home page for ${data.label}`],
          no: [`Nettside for ${data.label}`]
        },
        format: "text/html"
      }
    ],
    seeAlso: [
      {
        id: `http://sparql.ub.uib.no/sparql/query?query=describe<${data.seeAlso}>`,
        type: "Dataset",
        label: {
          en: ["Object Description in RDF"],
          en: ["Objekt beskrivelse i RDF"]
        },
        format: "application/rdf+xml"
      }
    ],
    provider: [
      {
        id: "https://www.uib.no/ub",
        type: "Agent",
        label: {
          no: ["Universitetsbiblioteket i Bergen"],
          en: ["University of Bergen Library"]
        },
        homepage: [
          {
            id: "https://www.uib.no/ub",
            type: "Text",
            label: {
              no: ["Universitetsbiblioteket i Bergen hjemmeside"],
              en: ["University of Bergen Library Homepage"]
            },
            format: "text/html"
          }
        ],
        logo: [
          {
            id: "https://marcus-manifest-api.vercel.app/uib-logo.png",
            type: "Image",
            format: "image/png",
            width: 200,
            height: 200,
          }
        ]
      }
    ],
    rights: "http://creativecommons.org/licenses/by/4.0/",
    requiredStatement: {
      label: {
        no: ["Kreditering"],
        en: ["Attribution"]
      },
      value: {
        no: ["Tilgjengeliggjort av Universitetsbiblioteket i Bergen"],
        en: ["Provided by University of Bergen Library"]
      }
    },
    items: [
      ...data.items.map(canvas => {
        return {
          id: canvas.id,
          type: canvas.type,
          label: { none: [`${canvas.label}`] },
          width: 1024,
          height: 1024,
          thumbnail: [
            {
              id: canvas.thumbnail,
              type: "Image",
              width: 200,
              height: 200,
            }
          ],
          items: [
            {
              id: canvas.items.id,
              type: "AnnotationPage",
              items: [
                {
                  id: `${canvas.id}/annotation/1`,
                  type: "Annotation",
                  motivation: "painting",
                  target: canvas.id,
                  body: {
                    id: canvas.items.body.id,
                    type: "Image",
                    format: "image/jpeg",
                    width: 1024,
                    height: 1024
                  }
                }
              ]
            }
          ]
        }
      })
    ],
    structures: [
      {
        id: data.structures.id,
        type: data.structures.type,
        label: {
          no: ["Standard innholdsfortegnelse"],
          en: ["Default"]
        },
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
    if (!id) {
      return error
    }

    const query = `
      PREFIX  sc:   <http://iiif.io/api/presentation/3#>
      PREFIX  oa:   <http://www.w3.org/ns/oa#>
      PREFIX  dct:  <http://purl.org/dc/terms/>
      PREFIX  rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      PREFIX  ubbont: <http://data.ub.uib.no/ontology/>
      PREFIX  rdfs: <http://www.w3.org/2000/01/rdf-schema#>
      PREFIX  dc:   <http://purl.org/dc/elements/1.1/>
    
      CONSTRUCT 
        { 
          ?manifestURL rdf:type sc:Manifest .
          ?manifestURL dct:identifier ?id .
          ?manifestURL rdfs:label ?title .
          ?manifestURL rdfs:seeAlso ?s .
          ?manifestURL sc:homepage ?homepage .
          ?manifestURL dc:description ?desc .
          ?manifestURL sc:thumbnail ?thumb .
          ?manifestURL sc:items ?part .
          ?manifestURL sc:items ?singleCanvas .
          ?manifestURL sc:structures ?rangeURL .
          ?rangeURL rdf:type sc:Range .
          ?rangeURL sc:items ?part .
          ?rangeURL sc:items ?singleCanvas .
          ?part rdf:type sc:Canvas .
          ?part rdfs:label ?seq .
          ?part sc:thumbnail ?canvasThumb .
          ?part sc:items ?resource .
          ?resource rdf:type oa:Annotation .
          ?resource oa:body ?imgUrl .
          ?singleCanvas rdf:type sc:Canvas .
          ?singleCanvas rdfs:label 1 .
          ?singleCanvas sc:thumbnail ?singleCanvasThumb .
          ?singleCanvas sc:items ?singlePart .
          ?singlePart rdf:type oa:Annotation .
          ?singlePart oa:body ?singleImageUrl .
        }
      WHERE
        { GRAPH ?g
            { VALUES ?id { "${id}" }
              ?s  ubbont:hasRepresentation  ?repr ;
                  dct:title             ?title ;
                  dct:identifier        ?id ;
                  ubbont:hasThumbnail   ?thumb
              OPTIONAL
                { ?s  dct:description  ?desc }
              OPTIONAL
                { ?repr     dct:hasPart       ?singlePart ;
                            rdfs:label        ?partLabel .
                  ?singlePart  ubbont:hasXSView  ?singleCanvasThumb
                  OPTIONAL
                    { ?singlePart  ubbont:hasMDView  ?singleMD }
                  OPTIONAL
                    { ?singlePart  ubbont:hasSMView  ?singleSM }
                }
              BIND(coalesce(?singleMD, ?singleSM) AS ?singleImage)
              OPTIONAL
                { ?repr     dct:hasPart         ?part ;
                            rdfs:label          ?partLabel .
                  ?part     ubbont:hasResource  ?resource ;
                            ubbont:sequenceNr   ?seq .
                  ?resource  ubbont:hasMDView   ?image ;
                            ubbont:hasXSView    ?canvasThumb
                }
              BIND(iri(?image) AS ?imgUrl)
              BIND(iri(?singleImage) AS ?singleImageUrl)
              BIND(iri(concat("https://marcus-manifest-api.vercel.app/api/iiif/manifest/", ?partLabel)) AS ?manifestURL)
              BIND(iri(concat("http://data.ub.uib.no/instance/manuscript/", ?id, "/manifest/range/1")) AS ?rangeURL)
              BIND(iri(concat("http://data.ub.uib.no/instance/page/", ?id, "_p1")) AS ?singleCanvas)
              BIND(iri(replace(str(?s), "data.ub.uib.no", "marcus.uib.no", "i")) AS ?homepage)
            }
        }
      ORDER BY ?s ?repr ?part ?resource ?image
    `

    const results = await fetch(`http://sparql.ub.uib.no/sparql/query?query=${encodeURIComponent(query)}&output=json`)

    return results
  }

  switch (method) {
    case 'GET':
      const response = await getObject(id)

      if (response.status >= 200 && response.status <= 299) {
        const results = await response.json();
        // Frame the result for nested json
        const awaitFramed = jsonld.frame(results, frame);
        let framed = await awaitFramed

        // Remove json-ld context 
        framed = omit(framed, ["@context"])

        // When madeObject is a single page we convert to an array of one
        if (Array.isArray(framed.items) == false) {
          framed.items = [framed.items]
        }
        if (Array.isArray(framed.structures.items) == false) {
          framed.structures.items = [framed.structures.items]
        }

        // Sort nested arrays
        framed.items = sortBy(framed.items, o => o.label)
        framed.structures.items = sortBy(framed.structures.items, i => parseInt(i.split("_p")[1]))

        // Create the manifest
        const constructedManifest = await constructManifest(framed)
        const manifest = await constructedManifest


        res.status(200).json(manifest)
      } else {
        // Handle errors
        console.log(response.status, response.statusText);
      }

      break
    default:
      res.setHeader('Allow', ['GET'])
      res.status(405).end(`Method ${method} Not Allowed`)
  }
}
