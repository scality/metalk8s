package utils_test

import (
	"context"
	"fmt"

	"github.com/go-logr/logr"

	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"

	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	logf "sigs.k8s.io/controller-runtime/pkg/log"

	"k8s.io/client-go/kubernetes/scheme"
	"k8s.io/client-go/tools/record"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/envtest"

	"github.com/scality/metalk8s/operator/pkg/controller/utils"
	"github.com/scality/metalk8s/operator/version"
)

var _ = Describe("ObjectHandler", func() {
	var (
		testenv *envtest.Environment

		h             utils.ObjectHandler
		componentName string
		appName       string
		c             client.Client
		ctx           context.Context
		log           logr.Logger
		recorder      *record.FakeRecorder
	)

	BeforeEach(func() {
		testenv = &envtest.Environment{}

		cfg, err := testenv.Start()
		Expect(err).ToNot(HaveOccurred())

		c, err = client.New(cfg, client.Options{})
		Expect(err).ToNot(HaveOccurred())

		log = logf.Log.WithName("utils-test-logger")
		recorder = record.NewFakeRecorder(10)
		componentName = "testcomponentname"
		appName = "testappname"

		h = *utils.NewObjectHandler(
			&corev1.ConfigMap{ObjectMeta: metav1.ObjectMeta{Name: "owner", Namespace: "default", UID: "owner-uid"}},
			c, scheme.Scheme, recorder, log,
			componentName, appName,
		)
		ctx = context.Background()
	})

	AfterEach(func() {
		Expect(testenv.Stop()).To(Succeed())
	})

	Describe("CreateOrUpdateOrDelete", func() {
		It("does nothing", func() {
			changed, err := h.CreateOrUpdateOrDelete(ctx, nil, nil, nil)

			Expect(err).ToNot(HaveOccurred())
			Expect(changed).To(BeFalse())
		})

		It("add standard metadata", func() {
			obj := &corev1.ConfigMap{ObjectMeta: metav1.ObjectMeta{Name: "foo", Namespace: "default"}}

			changed, err := h.CreateOrUpdateOrDelete(ctx, []client.Object{obj}, nil, nil)

			Expect(err).ToNot(HaveOccurred())
			Expect(changed).To(BeTrue())

			cm := &corev1.ConfigMap{}
			Expect(c.Get(ctx, client.ObjectKeyFromObject(obj), cm)).To(Succeed())

			// NOTE: We only check for some labels, to avoid
			// having huge copy/paste between test and code
			Expect(cm.GetLabels()).To(ContainElements([]string{componentName, appName, version.Version}))
			// We do not check the OwnerReference content
			Expect(cm.OwnerReferences).ToNot(BeEmpty())

			// Ensure it does not report change if we re-call the function
			changed, err = h.CreateOrUpdateOrDelete(ctx, []client.Object{obj}, nil, nil)

			Expect(err).ToNot(HaveOccurred())
			Expect(changed).To(BeFalse())
		})

		It("does some custom mutate", func() {
			customMutate := func(o client.Object) error {
				labels := o.GetLabels()
				labels["toto"] = "abcdef"
				return nil
			}
			obj := &corev1.ConfigMap{ObjectMeta: metav1.ObjectMeta{Name: "bar", Namespace: "default"}}

			changed, err := h.CreateOrUpdateOrDelete(ctx, []client.Object{obj}, nil, customMutate)

			Expect(err).ToNot(HaveOccurred())
			Expect(changed).To(BeTrue())

			cm := &corev1.ConfigMap{}
			Expect(c.Get(ctx, client.ObjectKeyFromObject(obj), cm)).To(Succeed())

			// NOTE: We still expect the Standard mutate to happen also
			Expect(cm.GetLabels()).To(ContainElements([]string{componentName, appName, version.Version, "abcdef"}))
			Expect(cm.OwnerReferences).ToNot(BeEmpty())

			// Ensure it does not report change if we re-call the function
			changed, err = h.CreateOrUpdateOrDelete(ctx, []client.Object{obj}, nil, customMutate)

			Expect(err).ToNot(HaveOccurred())
			Expect(changed).To(BeFalse())
		})

		It("add standard metadata - DaemonSet specific", func() {
			// NOTE: We need a really simple mutate function since the container spec cannot
			// be empty on a DaemonSet
			customMutate := func(o client.Object) error {
				ds := o.(*appsv1.DaemonSet)
				if len(ds.Spec.Template.Spec.Containers) == 0 {
					ds.Spec.Template.Spec.Containers = []corev1.Container{{}}
				}
				container := &ds.Spec.Template.Spec.Containers[0]
				container.Name = "test"
				container.Image = "test-img:1.2.3"
				return nil
			}
			obj := &appsv1.DaemonSet{ObjectMeta: metav1.ObjectMeta{Name: "my-ds", Namespace: "default"}}

			changed, err := h.CreateOrUpdateOrDelete(ctx, []client.Object{obj}, nil, customMutate)

			Expect(err).ToNot(HaveOccurred())
			Expect(changed).To(BeTrue())

			ds := &appsv1.DaemonSet{}
			Expect(c.Get(ctx, client.ObjectKeyFromObject(obj), ds)).To(Succeed())

			// NOTE: We still expect the Standard mutate to happen also
			Expect(ds.GetLabels()).To(ContainElements([]string{componentName, appName, version.Version}))
			Expect(ds.OwnerReferences).ToNot(BeEmpty())

			// DaemonSet specific mutates
			Expect(ds.Spec.Template.GetLabels()).To(ContainElements([]string{componentName, appName, version.Version}))
			Expect(ds.Spec.Selector.MatchLabels).To(ContainElement(appName))

			// Ensure it does not report change if we re-call the function
			changed, err = h.CreateOrUpdateOrDelete(ctx, []client.Object{obj}, nil, customMutate)

			Expect(err).ToNot(HaveOccurred())
			Expect(changed).To(BeFalse())
		})

		It("report error in mutate", func() {
			obj := &corev1.ConfigMap{ObjectMeta: metav1.ObjectMeta{Name: "invalid", Namespace: "default"}}

			_, err := h.CreateOrUpdateOrDelete(ctx, []client.Object{obj}, nil, func(o client.Object) error { return fmt.Errorf("An ErrOr !") })

			Expect(err).To(HaveOccurred())
			Expect(err.Error()).To(Equal("An ErrOr !"))
		})

		It("does remove object", func() {
			obj := &corev1.ConfigMap{ObjectMeta: metav1.ObjectMeta{Name: "baz", Namespace: "default"}}

			Expect(c.Create(ctx, obj)).To(Succeed())

			changed, err := h.CreateOrUpdateOrDelete(ctx, nil, []client.Object{obj}, nil)

			Expect(err).ToNot(HaveOccurred())
			Expect(changed).To(BeTrue())

			err = c.Get(ctx, client.ObjectKeyFromObject(obj), &corev1.ConfigMap{})

			Expect(err).To(HaveOccurred())
			Expect(errors.IsNotFound(err)).To(BeTrue())

			// Ensure it does not report change if we re-call the function
			changed, err = h.CreateOrUpdateOrDelete(ctx, nil, []client.Object{obj}, nil)

			Expect(err).ToNot(HaveOccurred())
			Expect(changed).To(BeFalse())
		})

		It("can do multiple update and delete at the same time", func() {
			customMutate := func(o client.Object) error {
				labels := o.GetLabels()
				labels["toto"] = "abcdef"
				return nil
			}
			objToUpdate := []client.Object{
				&corev1.ConfigMap{ObjectMeta: metav1.ObjectMeta{Name: "obj-1", Namespace: "default"}},
				&corev1.ConfigMap{ObjectMeta: metav1.ObjectMeta{Name: "obj-2", Namespace: "default"}},
			}
			objToDelete := &corev1.ConfigMap{ObjectMeta: metav1.ObjectMeta{Name: "obj-to-delete", Namespace: "default"}}

			// Let's create obj to delete first
			Expect(c.Create(ctx, objToDelete)).To(Succeed())

			changed, err := h.CreateOrUpdateOrDelete(ctx, objToUpdate, []client.Object{objToDelete}, customMutate)

			Expect(err).ToNot(HaveOccurred())
			Expect(changed).To(BeTrue())

			for _, obj := range objToUpdate {
				cm := &corev1.ConfigMap{}

				Expect(c.Get(ctx, client.ObjectKeyFromObject(obj), cm)).To(Succeed())

				// NOTE: We still expect the Standard mutate to happen also
				Expect(cm.GetLabels()).To(ContainElements([]string{componentName, appName, version.Version, "abcdef"}))
				Expect(cm.OwnerReferences).ToNot(BeEmpty())
			}

			err = c.Get(ctx, client.ObjectKeyFromObject(objToDelete), &corev1.ConfigMap{})

			Expect(err).To(HaveOccurred())
			Expect(errors.IsNotFound(err)).To(BeTrue())

			// Ensure it does not report change if we re-call the function
			changed, err = h.CreateOrUpdateOrDelete(ctx, objToUpdate, []client.Object{objToDelete}, customMutate)

			Expect(err).ToNot(HaveOccurred())
			Expect(changed).To(BeFalse())
		})
	})

	Describe("SendEvent", func() {
		It("send normal event", func() {
			Expect(recorder.Events).To(BeEmpty())
			h.SendEvent(metav1.ConditionTrue, "test reason", "test message")
			Expect(recorder.Events).To(HaveLen(1))

			Expect(<-recorder.Events).To(BeEquivalentTo("Normal test reason test message"))
		})

		It("send warning event", func() {
			Expect(recorder.Events).To(BeEmpty())
			h.SendEvent(metav1.ConditionUnknown, "test reason", "test message")
			Expect(recorder.Events).To(HaveLen(1))

			Expect(<-recorder.Events).To(BeEquivalentTo("Warning test reason test message"))
		})
	})

	Describe("GetMatchingLabels", func() {
		It("retrieve all the labels", func() {
			Expect(h.GetMatchingLabels(true)).To(ContainElements([]string{componentName, appName, version.Version}))
		})

		It("does not retrieve version label", func() {
			labels := h.GetMatchingLabels(false)

			Expect(labels).To(ContainElements([]string{componentName, appName}))
			Expect(labels).ToNot(ContainElement(version.Version))
		})
	})
})

var _ = Describe("Metadata Update", func() {
	Describe("UpdateLabels", func() {
		It("create the label map", func() {
			obj := &corev1.ConfigMap{}

			Expect(obj.GetLabels()).To(BeNil())

			utils.UpdateLabels(obj, map[string]string{})

			Expect(obj.GetLabels()).ToNot(BeNil())
			Expect(obj.GetLabels()).To(BeEmpty())
		})

		It("add new label", func() {
			obj := &corev1.ConfigMap{}

			labels := map[string]string{
				"my.first/label":  "abcd",
				"my.second/label": "def",
			}

			utils.UpdateLabels(obj, labels)

			Expect(obj.GetLabels()).To(BeEquivalentTo(labels))
		})

		It("update labels", func() {
			obj := &corev1.ConfigMap{
				ObjectMeta: metav1.ObjectMeta{
					Labels: map[string]string{
						"my.first/label": "foo",
					},
				},
			}

			labels := map[string]string{
				"my.first/label":  "abcd",
				"my.second/label": "def",
			}

			utils.UpdateLabels(obj, labels)

			Expect(obj.GetLabels()).To(BeEquivalentTo(labels))
		})

		It("does not remove existing labels", func() {
			obj := &corev1.ConfigMap{
				ObjectMeta: metav1.ObjectMeta{
					Labels: map[string]string{
						"my.existing/label": "foo",
					},
				},
			}

			utils.UpdateLabels(obj, map[string]string{
				"my.first/label":  "abcd",
				"my.second/label": "def",
			})

			Expect(obj.GetLabels()).To(BeEquivalentTo(map[string]string{
				"my.existing/label": "foo",
				"my.first/label":    "abcd",
				"my.second/label":   "def",
			}))
		})
	})

	Describe("UpdateAnnotation", func() {
		It("create the annotation map", func() {
			obj := &corev1.ConfigMap{}

			Expect(obj.GetAnnotations()).To(BeNil())

			utils.UpdateAnnotations(obj, map[string]string{})

			Expect(obj.GetAnnotations()).ToNot(BeNil())
			Expect(obj.GetAnnotations()).To(BeEmpty())
		})

		It("add new annotation", func() {
			obj := &corev1.ConfigMap{}

			annots := map[string]string{
				"my.first/annote":  "abcd",
				"my.second/annote": "def",
			}

			utils.UpdateAnnotations(obj, annots)

			Expect(obj.GetAnnotations()).To(BeEquivalentTo(annots))
		})

		It("update annotations", func() {
			obj := &corev1.ConfigMap{
				ObjectMeta: metav1.ObjectMeta{
					Annotations: map[string]string{
						"my.first/annote": "foo",
					},
				},
			}

			annots := map[string]string{
				"my.first/annote":  "abcd",
				"my.second/annote": "def",
			}

			utils.UpdateAnnotations(obj, annots)

			Expect(obj.GetAnnotations()).To(BeEquivalentTo(annots))
		})

		It("does not remove existing annotations", func() {
			obj := &corev1.ConfigMap{
				ObjectMeta: metav1.ObjectMeta{
					Annotations: map[string]string{
						"my.existing/annote": "foo",
					},
				},
			}

			utils.UpdateAnnotations(obj, map[string]string{
				"my.first/annote":  "abcd",
				"my.second/annote": "def",
			})

			Expect(obj.GetAnnotations()).To(BeEquivalentTo(map[string]string{
				"my.existing/annote": "foo",
				"my.first/annote":    "abcd",
				"my.second/annote":   "def",
			}))
		})
	})

	Describe("SetVersionLabel", func() {
		It("set the version label", func() {
			obj := &corev1.ConfigMap{}

			utils.SetVersionLabel(obj, "1.2.3")

			Expect(obj.GetLabels()).To(ContainElement("1.2.3"))
		})

		It("can update the version label", func() {
			obj := &corev1.ConfigMap{}

			utils.SetVersionLabel(obj, "1.2.3")

			Expect(obj.GetLabels()).To(ContainElement("1.2.3"))

			utils.SetVersionLabel(obj, "4.5.6")

			Expect(obj.GetLabels()).ToNot(ContainElement("1.2.3"))
			Expect(obj.GetLabels()).To(ContainElement("4.5.6"))
		})
	})
})
